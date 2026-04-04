/**
 * OfflineGame.jsx
 * Shows automatically when navigator.onLine === false.
 * Two games: Flappy Bird (canvas) + Tetris (canvas).
 * Same dark theme as Synapse.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Flappy Bird ─────────────────────────────────────────────────────────── */
function FlappyBird({ onScore }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ bird:{y:200,vy:0}, pipes:[], score:0, alive:true, started:false, frame:0 });
  const rafRef    = useRef(null);

  const W = 400, H = 500, GAP = 140, PIPE_W = 52, SPEED = 2.2, GRAV = 0.38, JUMP = -7.2;

  const reset = useCallback(() => {
    stateRef.current = { bird:{y:200,vy:0}, pipes:[], score:0, alive:true, started:false, frame:0 };
    onScore(0);
  }, [onScore]);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.alive) { reset(); return; }
    if (!s.started) s.started = true;
    s.bird.vy = JUMP;
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    const draw = () => {
      const s = stateRef.current;
      s.frame++;

      if (s.started && s.alive) {
        // Physics
        s.bird.vy += GRAV;
        s.bird.y  += s.bird.vy;

        // Spawn pipes
        if (s.frame % 90 === 0) {
          const topH = 60 + Math.random() * (H - GAP - 120);
          s.pipes.push({ x: W, top: topH, scored: false });
        }

        // Move pipes + score
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
        s.pipes.forEach(p => {
          p.x -= SPEED;
          if (!p.scored && p.x + PIPE_W < 80) {
            p.scored = true; s.score++; onScore(s.score);
          }
          // Collision
          const bx=70, by=s.bird.y, br=14;
          if (bx+br>p.x && bx-br<p.x+PIPE_W && (by-br<p.top || by+br>p.top+GAP)) s.alive=false;
        });

        // Floor/ceiling
        if (s.bird.y > H - 30 || s.bird.y < 0) s.alive = false;
      }

      // ── Draw ──
      // Sky gradient
      const sky = ctx.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#0d0d1a'); sky.addColorStop(1,'#1a1a2e');
      ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

      // Stars
      ctx.fillStyle='rgba(255,255,255,0.4)';
      for(let i=0;i<20;i++){
        const sx=(i*137)%W, sy=(i*97)%200;
        ctx.fillRect(sx,sy,1,1);
      }

      // Pipes
      s.pipes.forEach(p => {
        const grad = ctx.createLinearGradient(p.x,0,p.x+PIPE_W,0);
        grad.addColorStop(0,'#22c55e'); grad.addColorStop(0.5,'#16a34a'); grad.addColorStop(1,'#15803d');
        ctx.fillStyle=grad;
        ctx.fillRect(p.x,0,PIPE_W,p.top);
        ctx.fillRect(p.x,p.top+GAP,PIPE_W,H-p.top-GAP);
        // Pipe caps
        ctx.fillStyle='#166534';
        ctx.fillRect(p.x-4,p.top-18,PIPE_W+8,18);
        ctx.fillRect(p.x-4,p.top+GAP,PIPE_W+8,18);
      });

      // Ground
      ctx.fillStyle='#854d0e'; ctx.fillRect(0,H-30,W,30);
      ctx.fillStyle='#65a30d'; ctx.fillRect(0,H-30,W,6);

      // Bird body
      const by = stateRef.current.bird.y;
      const angle = Math.min(Math.max(stateRef.current.bird.vy*0.05,-0.4),0.6);
      ctx.save();
      ctx.translate(70,by);
      ctx.rotate(angle);
      // Body
      ctx.fillStyle='#fbbf24';
      ctx.beginPath(); ctx.ellipse(0,0,16,13,0,0,Math.PI*2); ctx.fill();
      // Wing
      ctx.fillStyle='#f59e0b';
      ctx.beginPath(); ctx.ellipse(-4,4,10,7,0.4,0,Math.PI*2); ctx.fill();
      // Eye
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(7,-4,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1e293b'; ctx.beginPath(); ctx.arc(8,-4,2.5,0,Math.PI*2); ctx.fill();
      // Beak
      ctx.fillStyle='#f97316';
      ctx.beginPath(); ctx.moveTo(15,-1); ctx.lineTo(24,2); ctx.lineTo(15,5); ctx.fill();
      ctx.restore();

      // Score
      ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.font='bold 28px Inter,sans-serif';
      ctx.textAlign='center';
      ctx.fillText(s.score, W/2, 50);

      // Start / Death screen
      if (!s.started) {
        ctx.fillStyle='rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#a5b4fc'; ctx.font='bold 22px Inter,sans-serif'; ctx.textAlign='center';
        ctx.fillText('FLAPPY SYNAPSE',W/2,H/2-30);
        ctx.fillStyle='#888'; ctx.font='14px Inter,sans-serif';
        ctx.fillText('Press SPACE or tap to fly',W/2,H/2+10);
      } else if (!s.alive) {
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#f87171'; ctx.font='bold 26px Inter,sans-serif'; ctx.textAlign='center';
        ctx.fillText('GAME OVER',W/2,H/2-30);
        ctx.fillStyle='#fff'; ctx.font='16px Inter,sans-serif';
        ctx.fillText(`Score: ${s.score}`,W/2,H/2+5);
        ctx.fillStyle='#888'; ctx.font='13px Inter,sans-serif';
        ctx.fillText('Press SPACE or tap to restart',W/2,H/2+35);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.code==='Space'||e.key===' ') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  return (
    <canvas ref={canvasRef} width={W} height={H}
      onClick={jump}
      style={{ borderRadius:16, cursor:'pointer', display:'block', boxShadow:'0 8px 48px rgba(0,0,0,0.6)' }}
    />
  );
}

/* ─── Tetris ──────────────────────────────────────────────────────────────── */
function Tetris({ onScore }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const rafRef    = useRef(null);
  const lastRef   = useRef(0);

  const COLS=10, ROWS=20, CELL=26;
  const W=COLS*CELL, H=ROWS*CELL;

  const PIECES = [
    { shape:[[1,1,1,1]],           color:'#06b6d4' },
    { shape:[[1,1],[1,1]],         color:'#fbbf24' },
    { shape:[[0,1,0],[1,1,1]],     color:'#8b5cf6' },
    { shape:[[1,0],[1,1],[0,1]],   color:'#22c55e' },
    { shape:[[0,1],[1,1],[1,0]],   color:'#ef4444' },
    { shape:[[1,0],[1,0],[1,1]],   color:'#f97316' },
    { shape:[[0,1],[0,1],[1,1]],   color:'#3b82f6' },
  ];

  const newPiece = () => {
    const p = PIECES[Math.floor(Math.random()*PIECES.length)];
    return { shape:[...p.shape.map(r=>[...r])], color:p.color, x:3, y:0 };
  };

  const emptyBoard = () => Array.from({length:ROWS},()=>Array(COLS).fill(null));

  const initState = () => ({
    board:  emptyBoard(),
    piece:  newPiece(),
    next:   newPiece(),
    score:  0,
    lines:  0,
    level:  1,
    alive:  true,
    started:true,
  });

  const fits = (board, piece, dx=0, dy=0, shape=piece.shape) =>
    shape.every((row,r)=>row.every((v,c)=>!v||
      (piece.y+r+dy>=0 && piece.y+r+dy<ROWS && piece.x+c+dx>=0 && piece.x+c+dx<COLS && !board[piece.y+r+dy][piece.x+c+dx])));

  const rotate = (shape) => shape[0].map((_,i)=>shape.map(r=>r[i]).reverse());

  const placePiece = (s) => {
    const board = s.board.map(r=>[...r]);
    s.piece.shape.forEach((row,r)=>row.forEach((v,c)=>{ if(v) board[s.piece.y+r][s.piece.x+c]=s.piece.color; }));
    // Clear lines
    let cleared = 0;
    const newBoard = board.filter(row=>row.some(c=>!c));
    cleared = ROWS-newBoard.length;
    while(newBoard.length<ROWS) newBoard.unshift(Array(COLS).fill(null));
    const pts=[0,100,300,500,800][cleared]*(s.level);
    s.score+=pts; s.lines+=cleared;
    s.level=Math.floor(s.lines/10)+1;
    onScore(s.score);
    s.board=newBoard;
    s.piece=s.next;
    s.next=newPiece();
    if(!fits(s.board,s.piece)) s.alive=false;
  };

  useEffect(() => {
    stateRef.current = { ...initState(), started:false };
    const canvas=canvasRef.current, ctx=canvas.getContext('2d');

    const draw = (ts) => {
      const s=stateRef.current;
      if (!s) { rafRef.current=requestAnimationFrame(draw); return; }

      // Auto-drop
      const dropInterval=Math.max(100,600-s.level*50);
      if(s.started&&s.alive&&ts-lastRef.current>dropInterval){
        lastRef.current=ts;
        if(fits(s.board,s.piece,0,1)) s.piece.y++;
        else placePiece(s);
      }

      // ── Draw background ──
      ctx.fillStyle='#0a0a0f'; ctx.fillRect(0,0,W,H);

      // Grid lines
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
      for(let r=0;r<ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(W,r*CELL);ctx.stroke();}
      for(let c=0;c<COLS;c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,H);ctx.stroke();}

      const drawCell=(x,y,color,alpha=1)=>{
        if(!color) return;
        ctx.globalAlpha=alpha;
        const grad=ctx.createLinearGradient(x*CELL,y*CELL,(x+1)*CELL,(y+1)*CELL);
        grad.addColorStop(0,color+'dd'); grad.addColorStop(1,color+'88');
        ctx.fillStyle=grad;
        ctx.fillRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2);
        ctx.strokeStyle=color+'cc'; ctx.lineWidth=1;
        ctx.strokeRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2);
        ctx.globalAlpha=1;
      };

      // Board
      s.board.forEach((row,r)=>row.forEach((c,col)=>drawCell(col,r,c)));

      // Ghost piece
      if(s.alive&&s.started){
        let ghostY=s.piece.y;
        while(fits(s.board,s.piece,0,ghostY-s.piece.y+1)) ghostY++;
        if(ghostY!==s.piece.y){
          s.piece.shape.forEach((row,r)=>row.forEach((v,c)=>{ if(v) drawCell(s.piece.x+c,ghostY+r,s.piece.color,0.2); }));
        }
        // Active piece
        s.piece.shape.forEach((row,r)=>row.forEach((v,c)=>{ if(v) drawCell(s.piece.x+c,s.piece.y+r,s.piece.color); }));
      }

      // Overlay screens
      if(!s.started){
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#a5b4fc'; ctx.font='bold 22px Inter,sans-serif'; ctx.textAlign='center';
        ctx.fillText('TETRIS',W/2,H/2-40);
        ctx.fillStyle='#888'; ctx.font='13px Inter,sans-serif';
        ctx.fillText('← → : Move',W/2,H/2);
        ctx.fillText('↑ : Rotate   ↓ : Drop',W/2,H/2+22);
        ctx.fillText('Press any arrow key to start',W/2,H/2+50);
      } else if(!s.alive){
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#f87171'; ctx.font='bold 24px Inter,sans-serif'; ctx.textAlign='center';
        ctx.fillText('GAME OVER',W/2,H/2-30);
        ctx.fillStyle='#fff'; ctx.font='16px Inter,sans-serif';
        ctx.fillText(`Score: ${s.score}`,W/2,H/2+5);
        ctx.fillStyle='#888'; ctx.font='13px Inter,sans-serif';
        ctx.fillText('Press R to restart',W/2,H/2+35);
      }

      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(()=>{
    const onKey=(e)=>{
      const s=stateRef.current; if(!s) return;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
      if(!s.started){ s.started=true; return; }
      if(!s.alive){ if(e.key==='r'||e.key==='R'){ stateRef.current=initState(); onScore(0); } return; }
      if(e.key==='ArrowLeft'  && fits(s.board,s.piece,-1,0)) s.piece.x--;
      if(e.key==='ArrowRight' && fits(s.board,s.piece,1,0))  s.piece.x++;
      if(e.key==='ArrowDown'  && fits(s.board,s.piece,0,1))  s.piece.y++;
      if(e.key==='ArrowUp'){
        const rot=rotate(s.piece.shape);
        if(fits(s.board,{...s.piece,shape:rot},0,0,rot)) s.piece.shape=rot;
      }
      if(e.key===' '){ while(fits(s.board,s.piece,0,1)) s.piece.y++; placePiece(s); }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{ borderRadius:12, display:'block', boxShadow:'0 8px 48px rgba(0,0,0,0.6)' }}
    />
  );
}

/* ─── OfflineGame shell ───────────────────────────────────────────────────── */
export default function OfflineGame() {
  const [game,    setGame]    = useState('flappy');
  const [score,   setScore]   = useState(0);
  const [online,  setOnline]  = useState(navigator.onLine);

  useEffect(()=>{
    const on=()=>setOnline(true);
    const off=()=>setOnline(false);
    window.addEventListener('online',on);
    window.addEventListener('offline',off);
    return ()=>{ window.removeEventListener('online',on); window.removeEventListener('offline',off); };
  },[]);

  if(online) return null;

  return (
    <div style={{
      position:'fixed',inset:0,background:'#050508',zIndex:999999,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24,
      fontFamily:'Inter,sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:13, color:'#555', marginBottom:6, letterSpacing:'2px', textTransform:'uppercase' }}>
          You're offline
        </p>
        <h1 style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-1px', margin:0 }}>
          Synapse <span style={{ color:'#6366f1' }}>Arcade</span>
        </h1>
        <p style={{ fontSize:12, color:'#444', marginTop:4 }}>Play while we reconnect…</p>
      </div>

      {/* Game switcher */}
      <div style={{ display:'flex', gap:8, background:'#111', borderRadius:12, padding:4, border:'1px solid #1e1e1e' }}>
        {[['flappy','🐦 Flappy Bird'],['tetris','🧱 Tetris']].map(([id,label])=>(
          <button key={id} onClick={()=>{ setGame(id); setScore(0); }}
            style={{ padding:'8px 20px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all .2s',
              background: game===id?'#6366f1':'transparent', color: game===id?'#fff':'#666',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Score */}
      <div style={{ display:'flex', gap:24, alignItems:'center' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:11, color:'#555', margin:0 }}>SCORE</p>
          <p style={{ fontSize:28, fontWeight:700, color:'#a5b4fc', margin:0, lineHeight:1 }}>{score}</p>
        </div>
      </div>

      {/* Game canvas */}
      <div>
        {game==='flappy' && <FlappyBird onScore={setScore}/>}
        {game==='tetris' && <Tetris onScore={setScore}/>}
      </div>

      {/* Controls hint */}
      <p style={{ fontSize:11, color:'#333', textAlign:'center' }}>
        {game==='flappy'?'SPACE or tap to flap':'← → ↑ to move/rotate · SPACE to hard-drop · R to restart'}
      </p>
    </div>
  );
}
