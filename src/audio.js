// 星陨 · 程序化音效（WebAudio 实时合成，零音频资源文件）
// 设计：极短音色 + 每 60ms 的声音预算，避免弹幕密集时糊成噪音墙。

const MASTER = 0.5;

export function createAudio() {
  let ac = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;
  let budget = 16;
  let budgetAt = 0;

  function ensure() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : MASTER;
      master.connect(ac.destination);
      const len = Math.floor(ac.sampleRate * 0.4);
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  /** 声音预算：同一瞬间最多这么点"声音量"，超出直接丢弃 */
  function allow(cost) {
    const now = performance.now();
    if (now - budgetAt > 60) { budgetAt = now; budget = 16; }
    if (budget < cost) return false;
    budget -= cost;
    return true;
  }

  function tone(o) {
    const a = ensure();
    if (!a || muted) return;
    const t0 = a.currentTime + (o.delay || 0);
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(30, o.freq), t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + o.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.08, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + o.dur + 0.03);
  }

  function noise(o) {
    const a = ensure();
    if (!a || muted) return;
    const t0 = a.currentTime + (o.delay || 0);
    const src = a.createBufferSource();
    src.buffer = noiseBuf;
    const f = a.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.cut || 1200, t0);
    if (o.cutTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.cutTo), t0 + o.dur);
    const g = a.createGain();
    g.gain.setValueAtTime(o.gain || 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + o.dur + 0.03);
  }

  return {
    /** 浏览器要求首次用户操作后才能出声 */
    unlock() { ensure(); },
    setMuted(v) {
      muted = !!v;
      if (master) master.gain.value = muted ? 0 : MASTER;
      return muted;
    },
    toggleMute() { return this.setMuted(!muted); },
    get muted() { return muted; },

    shoot() { if (allow(1)) tone({ freq: 880, to: 600, dur: 0.045, type: 'square', gain: 0.03 }); },
    hit() { if (allow(1)) noise({ dur: 0.03, gain: 0.045, cut: 2600, cutTo: 900 }); },
    kill() {
      if (!allow(2)) return;
      noise({ dur: 0.1, gain: 0.09, cut: 1400, cutTo: 200 });
      tone({ freq: 300, to: 120, dur: 0.09, type: 'triangle', gain: 0.04 });
    },
    pickup() { if (allow(1)) tone({ freq: 1250, to: 1750, dur: 0.05, type: 'sine', gain: 0.045 }); },
    levelUp() {
      tone({ freq: 523, dur: 0.1, type: 'triangle', gain: 0.08 });
      tone({ freq: 784, dur: 0.14, type: 'triangle', gain: 0.08, delay: 0.09 });
    },
    jump() {
      tone({ freq: 440, to: 1320, dur: 0.5, type: 'triangle', gain: 0.1 });
      tone({ freq: 660, to: 1980, dur: 0.5, type: 'sine', gain: 0.06, delay: 0.05 });
    },
    bossWarn() { tone({ freq: 110, to: 78, dur: 0.7, type: 'sawtooth', gain: 0.09 }); },
    /** 预警提示音（狙击机瞄准你时）：短促上滑的高音，与视觉预警同时给 —— 可读性优先于惊喜 */
    warn() { if (allow(1)) tone({ freq: 1500, to: 2200, dur: 0.08, type: 'square', gain: 0.03 }); },
    hurt() {
      noise({ dur: 0.16, gain: 0.12, cut: 1800, cutTo: 120 });
      tone({ freq: 220, to: 90, dur: 0.18, type: 'square', gain: 0.05 });
    },
    shield() { tone({ freq: 1400, to: 900, dur: 0.18, type: 'sine', gain: 0.07 }); },
    over() { tone({ freq: 300, to: 60, dur: 1.2, type: 'sawtooth', gain: 0.1 }); }
  };
}
