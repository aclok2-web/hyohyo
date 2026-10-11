(function(){
'use strict';
const labels=['a framed photograph of a family or people','a handwritten note on a piece of paper','a refrigerator','a cardboard box or moving boxes','a person without a photograph','a television or computer screen','a table or desk','a chair or sofa','a book','a phone','a wall or floor','a landscape or outdoor scene','a blank or dark image'];
const targets={family_photo_living:{index:0,name:'가족사진',hint:'사람이 담긴 인화 사진이나 액자를 찍어 주세요.'},proverb_note:{index:1,name:'손글씨 쪽지',hint:'종이에 직접 쓴 메모를 찍어 주세요.'},fridge:{index:2,name:'냉장고',hint:'냉장고 전체가 보이도록 찍어 주세요.'},yard_boxes:{index:3,name:'종이 상자',hint:'택배 상자나 종이 상자를 찍어 주세요.'},family_photo_final:{index:0,name:'가족사진',hint:'사람이 담긴 인화 사진이나 액자를 찍어 주세요.'}};
let classifierPromise;
async function classifier(status){
 if(!classifierPromise) classifierPromise=(async()=>{
  status.textContent='사진 인식 모델을 준비하고 있습니다. 첫 실행은 시간이 걸릴 수 있어요.';
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;
  return pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{quantized:true,progress_callback:p=>{if(p.status==='progress')status.textContent=`인식 모델 다운로드 중… ${Math.round(p.progress||0)}%`;}});
 })().catch(e=>{classifierPromise=null;throw e;});
 return classifierPromise;
}
function matches(results,target){const ranked=[...results].sort((a,b)=>b.score-a.score);return ranked[0]?.label===labels[target.index]&&ranked[0].score>=.45&&ranked[0].score-(ranked[1]?.score||0)>=.15;}
window.HYO_PHOTO={active:false,targets,matches,async open(target,game,onSuccess){
 if(this.active)return; const config=targets[target.id];if(!config)return;
 this.active=true;const wasPaused=game.paused;game.paused=true;Object.keys(game.input).forEach(k=>game.input[k]=false);
 const previousFocus=document.activeElement;const overlay=document.createElement('div');overlay.className='photo-recognition';
 overlay.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="photoTitle"><h2 id="photoTitle">사물 사진 인식</h2><p id="photoHint"></p><video autoplay muted playsinline hidden></video><canvas hidden></canvas><img alt="선택한 사물 사진" hidden><div class="photo-actions"><button type="button" data-camera>카메라 켜기</button><button type="button" data-capture hidden>촬영하기</button><label class="photo-upload">사진 선택<input type="file" accept="image/*"></label></div><p role="status" aria-live="polite" data-status>사진을 찍거나 선택한 뒤 인식해 주세요.</p><p class="photo-privacy">사진은 브라우저 안에서 분석하며 서버로 전송하지 않습니다.</p><div class="photo-actions"><button type="button" data-check disabled>사진 인식하기</button><button type="button" data-close>나중에 하기</button></div></section>`;
 overlay.querySelector('#photoHint').textContent=`찾을 사물: ${config.name}. ${config.hint}`;
 document.body.append(overlay);const q=s=>overlay.querySelector(s),video=q('video'),canvas=q('canvas'),preview=q('img'),status=q('[data-status]'),check=q('[data-check]');let stream=null,photo=null,closed=false,busy=false;
 const stop=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;q('[data-capture]').hidden=true;};
 const close=()=>{if(closed)return;closed=true;stop();overlay.remove();this.active=false;game.paused=wasPaused;Object.keys(game.input).forEach(k=>game.input[k]=false);previousFocus?.focus();};
 const select=async source=>{try{const image=new Image();image.src=source;await image.decode();if(closed)return;const scale=Math.min(1,1024/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);photo=canvas.toDataURL('image/jpeg',.9);preview.src=photo;preview.hidden=false;stop();check.disabled=false;status.textContent='사진이 준비됐어요. 사진 인식하기를 눌러 주세요.';}catch(e){status.textContent='사진을 읽지 못했습니다. JPG 또는 PNG 사진을 다시 선택해 주세요.';}};
 q('[data-close]').onclick=close;
 q('input').onchange=async e=>{if(busy)return;const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')){status.textContent='이미지 파일을 선택해 주세요.';return;}const url=URL.createObjectURL(file);try{await select(url);}finally{URL.revokeObjectURL(url);e.target.value='';}};
 q('[data-camera]').onclick=async()=>{if(busy)return;try{stop();const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(closed){next.getTracks().forEach(t=>t.stop());return;}stream=next;video.srcObject=stream;video.hidden=false;await video.play();q('[data-capture]').hidden=false;status.textContent='사물을 화면 가운데에 놓고 촬영하기를 눌러 주세요.';}catch(e){stop();status.textContent='카메라를 열지 못했습니다. 카메라 권한을 허용하거나 사진 선택을 이용해 주세요.';}};
 q('[data-capture]').onclick=()=>{if(!video.videoWidth)return;canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);select(canvas.toDataURL('image/jpeg',.9));};
 check.onclick=async()=>{if(busy||!photo)return;busy=true;check.disabled=true;q('input').disabled=true;q('[data-camera]').disabled=true;stop();try{const predict=await classifier(status);if(closed)return;status.textContent='사진 속 사물을 확인하고 있습니다…';const results=await predict(photo,labels,{hypothesis_template:'This is a photo of {}.'});if(closed)return;if(matches(results,config)){status.textContent=`${config.name} 인식 성공!`;close();onSuccess();}else{status.textContent=`${config.name}을 뚜렷하게 확인하지 못했어요. 사물이 크게 보이도록 다시 찍어 주세요.`;}}catch(e){if(!closed)status.textContent='인식 모델을 실행하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';}finally{busy=false;if(!closed){check.disabled=!photo;q('input').disabled=false;q('[data-camera]').disabled=false;}}};
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focusable=[...overlay.querySelectorAll('button,input')].filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});q('[data-camera]').focus();
}};
})();
