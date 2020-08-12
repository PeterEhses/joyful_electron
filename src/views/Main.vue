<template>
<div class="page page-start">

  <div class="headline">joyful depression</div>
  <div class="buttons">
    <button v-if="!isReady" class="btn btn-start">
      Please wait...
    </button>
  </div>
  <div class="everythingelse" v-if="isReady">
    <div class="bars">
      <h2>Values Direct</h2>
      <div v-for="value,item in expressions" :key="item">
        <div class="bar" :style="{'width': value*100+'%'}">

        </div>
        <p>{{item}}: {{value}}</p>


      </div>
    </div>
    <hr>
    <div class="bars">
      <h2>Values Historic Mean</h2>
      <div v-for="value,item in meanEmotions" :key="item">
        <div class="bar" :style="{'width': value*100+'%'}">

        </div>
        <p>{{item}}: {{value}}</p>


      </div>
    </div>
    <hr>
    <div class="slidyboi">

      <label>
        period
        <input type="range" min="1" max="50" value="50" class="slider" id="myRange" v-model="duration">
        <p>{{duration}}</p>
      </label>
      <label>
        History
        <input type="range" min="1" max="50" value="50" class="slider" id="mysecondRange" v-model="expressionsHistorySize">
        <p>{{expressionsHistorySize}}</p>
      </label>
      <label> send periodically <input type="checkbox" v-model="sendperiodically"></input></label>
      <button type="button" name="button" @click="sendwithTimeoutManual()">send / start if periodical</button>
    </div>
    <div class="">
      <p>If we would send a payload right now it would go to <code>{{paylaodAddress}}</code></p>
    </div>
    <div id="sendstatus" ref="statusBoi">

    </div>

    <video ref="cam" autoplay muted playsinline></video>
  </div>


</div>
</template>

<script>
export default {
  name: 'Main',
  data() {
    return {
      addressNumbers: {
        angry: 1,
        disgusted: 2,
        fearful: 3,
        happy: 4,
        neutral: 5,
        sad: 6,
        surprised: 7,
        none: "ERROR"
      },
      isReady: true,
      isPresented: false,
      oscIP: "127.0.0.1",
      oscPort: 7000,
      expressions: {
        angry: null,
        disgusted: null,
        fearful: null,
        happy: null,
        neutral: null,
        sad: null,
        surprised: null
      },
      expressionsHistorySize: 30,
      expressionsHistory: {
        angry: [],
        disgusted: [],
        fearful: [],
        happy: [],
        neutral: [],
        sad: [],
        surprised: [],
      },
      duration: 5, // timeout interval duration
      sendperiodically: true, // timeout repeat enable
    }
  },
  computed: {
    meanEmotions: function(){
      let meanemotions = {}
      for(const [key, value] of Object.entries(this.expressionsHistory)){
        let meanemotion = 0;
        for(let i = 0; i < this.expressionsHistorySize; i++){

        meanemotion += value[i]
        }

        meanemotion = meanemotion / this.expressionsHistorySize;
        meanemotions[key] = parseFloat(meanemotion.toFixed(2));
      }
      return meanemotions
    },
    payload: function() {
      return {
        address: this.paylaodAddress,
        args: [{
          type: "i",
          value: 1
        }]
      }
    },
    paylaodAddress: function() {
      let address = "/composition/layers/1/clips/"

      address += this.addressNumbers[this.dominantExpression || "none"]
      address += "/connect"
      return address
    },
    dominantExpression: function(){
      let highest = ""
      let highestval = 0;
      for(const [key, value] of Object.entries(this.meanEmotions)){
        //value = parseFloat(value)
        if(value > highestval){
          highestval = value
          highest = key
        }
      }
    return highest
    }
  },
  methods: {
    initCamera: async function(width, height) {
      // create cam reference
      let cam = this.$refs.cam;
      cam.width = width;
      cam.height = height;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: width,
          height: height
        }
      });
      cam.srcObject = stream;
      return new Promise((resolve) => {
        cam.onloadedmetadata = () => {
          resolve(cam);
        };
      });
    },
    sendwithTimeoutManual: function(){

      if(this.timeoutBoi){
        clearTimeout(this.timeoutBoi);
      }

      this.sendwithTimeout();
    },
    sendwithTimeout: function() {
      let that = this
      this.$refs.statusBoi.classList.add('sent');

      setTimeout(()=>{that.$refs.statusBoi.classList.remove('sent') }, 10);
      this.sendOsc(this.payload)
      if (this.sendperiodically) {

        this.timeoutBoi = setTimeout(() => {that.sendwithTimeout()}, that.duration*1000); // *1000 because timeout takes millis
      }


    },
    sendOsc: function(msg) {
      this.$udpPort.send(msg, this.oscIP, this.oscPort);
    },
    handleExpressions: function(expressions) {
      //console.dir(expressions);
      for (const [key, value] of Object.entries(expressions)) {
        // console.log(key + " " + value)

        let val = parseFloat(value.toFixed(2));
        expressions[key] = val
          this.expressionsHistory[key].push(val)
          this.expressionsHistory[key].shift()

      }
      this.expressions = expressions;
    }
  },
  watch: {
    expressionsHistorySize: function(){
      console.log(this.expressionsHistory["neutral"].length)
        for(const [key, value] of Object.entries(this.expressionsHistory)){
          if(this.expressionsHistory[key].length < this.expressionsHistorySize){
            let addthis = Array(this.expressionsHistorySize-this.expressionsHistory[key].length).fill(0)
            this.expressionsHistory[key] = this.expressionsHistory[key].concat(addthis)
          }
          this.expressionsHistory[key] = this.expressionsHistory[key].slice(0,this.expressionsHistorySize)
      }

    }
  },

  mounted() {



    for (const [key, value] of Object.entries(this.expressionsHistory)) {
      this.expressionsHistory[key] = Array(this.expressionsHistorySize).fill(0)
    }

    //console.dir(this.$udpPort);
    let testpayload = {
      address: "/s_new",
      args: [{
          type: "s",
          value: "default"
        },
        {
          type: "i",
          value: 100
        }
      ]
    }
    this.sendOsc(testpayload)
    // listen to messages
    this.$electron.ipcRenderer.on('message-from-worker', (event, data) => {
      if (data.command == 'ready') {
        // network is ready
        this.isReady = true;
        return;
      }
      if (data.command == 'expressions') {

        this.handleExpressions(data.payload.expressions)
      }

    });

    this.initCamera(640, 480)

  },

  beforeRouteEnter(to, from, next) {
    next(vm => {
      vm.isPresented = true;
    });
  },
  beforeRouteLeave(to, from, next) {
    this.isPresented = false;
    next();
  }
}
</script>

<style lang="scss">
.page-start {

    .headline {
        text-align: center;
        font-size: 2em;
        margin: 2em;
    }

    .buttons {
        text-align: center;
        margin: 2em;
        .btn {
            font-size: 48px;

            padding: 10px;
            width: 500px;
        }
    }
}

.bars {
    overflow: hidden;
    border-radius: 5px;
    width: 100%;
    background-color: #444;
    position: relative;
    & p {
        position: relative;
        padding: 0.2em 1em;
    }
}
.bar {
    position: absolute;
    background-color: #666;
    height: 1.3em;
}

.slidyboi {
    width: 100%;
    display: flex;
    & label {
        align-items: center;
        width: 100%;
        display: flex;
    }
}

#sendstatus{
  margin: 2em;
  width: 1em;
  height: 1em;
  border-radius: 1em;
  background: #3f6;
  opacity: 0.0;
transition: all 3s;
  &.sent{
    opacity: 1.0;
    transition: none;
  }
}

</style>
