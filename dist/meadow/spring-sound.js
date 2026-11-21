// Quiet, locally synthesized wind through grass with occasional soft wind chimes.
(() => {
  const button=document.getElementById('ambience');
  const Audio=window.AudioContext||window.webkitAudioContext;
  let context, master, timer, enabled=false, revision=0;
  function label(){
    button.setAttribute('aria-pressed',String(enabled));
    button.textContent=enabled?'关闭环境声':'开启环境声';
  }
  function build(){
    context=new Audio();
    master=context.createGain();master.gain.value=0;master.connect(context.destination);
    const length=context.sampleRate*7,buffer=context.createBuffer(1,length,context.sampleRate);
    const data=buffer.getChannelData(0);let previous=0;
    for(let i=0;i<length;i++){
      previous=(previous+(Math.random()*2-1)*.035)/1.035;
      const edge=Math.min(1,i/1800,(length-1-i)/1800);
      data[i]=previous*2.5*edge;
    }
    const source=context.createBufferSource(),filter=context.createBiquadFilter();
    filter.type='lowpass';filter.frequency.value=950;filter.Q.value=.45;
    const swell=context.createOscillator(),range=context.createGain();
    swell.frequency.value=.078;range.gain.value=340;swell.connect(range).connect(filter.frequency);
    source.buffer=buffer;source.loop=true;source.connect(filter).connect(master);
    source.start();swell.start();
  }
  function chime(){
    if(!enabled || document.hidden || context.state!=='running')return;
    const start=context.currentTime;
    const pitch=[329.63,392,440,523.25,587.33][Math.floor(Math.random()*5)];
    for(const [harmonic,volume] of [[1,.058],[2,.010]]){
      const tone=context.createOscillator(),env=context.createGain();
      tone.frequency.value=pitch*harmonic;
      env.gain.setValueAtTime(.0001,start);env.gain.exponentialRampToValueAtTime(volume,start+.16);
      env.gain.exponentialRampToValueAtTime(.0001,start+3.8);
      tone.connect(env).connect(master);tone.start(start);tone.stop(start+4);
      tone.onended=()=>{tone.disconnect();env.disconnect();};
    }
    timer=setTimeout(chime,9000+Math.random()*8000);
  }
  async function sync(){
    const rev=++revision;clearTimeout(timer);
    if(!context)return;
    try{
      if(enabled && !document.hidden){
        await context.resume();
        if(revision!==rev)return;
        master.gain.setTargetAtTime(.46,context.currentTime,.2);timer=setTimeout(chime,1800);
      }else{
        master.gain.setTargetAtTime(0,context.currentTime,.065);
        if(document.hidden)await context.suspend();
        else timer=setTimeout(()=>{if(rev===revision)context.suspend().catch(()=>{});},380);
      }
    }catch{if(revision===rev){enabled=false;label();}}
  }
  button.disabled=!Audio;
  button.addEventListener('click',()=>{try{if(!context)build();enabled=!enabled;label();sync();}catch{enabled=false;label();button.title='当前设备无法播放环境声';}});
  document.addEventListener('visibilitychange',sync);
  addEventListener('pagehide',()=>{enabled=false;label();sync();});
})();
