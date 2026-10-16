// 이펙트 (월드 좌표 파티클/플래시/링 등)
import {ctx,W,H,GY,camX,TAU,eout,lerp} from './core.js';
export const FX=[];
export const W2S=(wx,wy)=>[W/2+(wx-camX)*(H/720),GY*(H/720)+wy*(H/720)];
export const S2W=(px,py)=>[camX+(px-W/2)/(H/720),(py-GY*(H/720))/(H/720)];
export function addFX(o){o.t=0;FX.push(o);return o}
export function tickFX(dt){for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt;if(f.up)f.up(f,dt);if(f.t>=f.life)FX.splice(i,1)}}
export function drawFX(layer){const U=H/720;FX.forEach(f=>{if((f.layer||'front')!==layer)return;ctx.save();const[p,q]=W2S(f.x,f.y);ctx.translate(p,q);f.draw(f,U,f.t/f.life);ctx.restore()})}
export const FXL={
 ring:(x,y,size,col='255,240,180')=>addFX({x,y,life:.5,layer:'back',draw:(f,U,k)=>{const e=eout(k);ctx.strokeStyle=`rgba(${col},${1-k})`;ctx.lineWidth=(14*(1-e)+3)*size*U;ctx.beginPath();ctx.ellipse(0,0,(40+260*e)*size*U,(12+70*e)*size*U,0,0,TAU);ctx.stroke()}}),
 flash:(x,y,r,col='255,255,255')=>addFX({x,y,life:.14,draw:(f,U,k)=>{ctx.fillStyle=`rgba(${col},${.9*(1-k)})`;ctx.beginPath();ctx.arc(0,0,r*(.5+k)*U,0,TAU);ctx.fill()}}),
 spark:(x,y,n,col,spd=300,sz=6,grav=600)=>{for(let i=0;i<n;i++){const a=Math.random()*TAU,v=spd*(.4+Math.random()*.6);addFX({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-spd*.3,life:.35+Math.random()*.3,up:(f,dt)=>{f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=grav*dt},draw:(f,U,k)=>{ctx.fillStyle=col;ctx.globalAlpha=1-k;ctx.beginPath();ctx.arc(0,0,sz*(1-k*.6)*U,0,TAU);ctx.fill()}})}},
 star4:(x,y,r,col)=>addFX({x,y,life:.45,rot:Math.random(),draw:(f,U,k)=>{ctx.rotate(f.rot+k*2);ctx.fillStyle=col;ctx.globalAlpha=1-k;const R=r*U*(k<.3?k/.3:1);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?R*.25:R;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.fill()}}),
 dust:(x,n,spread)=>{for(let i=0;i<n;i++)addFX({x:x+(Math.random()-.5)*spread,y:-4,vx:(Math.random()-.5)*120,vy:-20-Math.random()*30,r:6+Math.random()*5,life:.45,up:(f,dt)=>{f.x+=f.vx*dt;f.y+=f.vy*dt},draw:(f,U,k)=>{ctx.fillStyle=`rgba(235,225,190,${.6*(1-k)})`;ctx.beginPath();ctx.arc(0,0,(f.r+k*12)*U,0,TAU);ctx.fill()}})},
 swoosh:(x,y,face,r,a0,a1,col,w=1)=>addFX({x,y,life:.2,draw:(f,U,k)=>{ctx.scale(face,1);ctx.strokeStyle=col;ctx.globalAlpha=(1-k)*.85;ctx.lineCap='round';ctx.lineWidth=22*w*U*(1-k*.5);ctx.beginPath();ctx.arc(0,0,r*U,a0,lerp(a0,a1,Math.min(1,.6+k)),a1<a0);ctx.stroke();ctx.lineWidth=8*w*U;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.stroke()}}),
};
