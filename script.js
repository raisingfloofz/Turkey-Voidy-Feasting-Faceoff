(()=>{'use strict';
const $=id=>document.getElementById(id),screens=['home','play','results'];
const recipes=[{id:'potatoes',name:'Mashed Potatoes',emoji:'🥔',ingredient:'🥔',actions:['Peel potatoes','Mash potatoes'],cook:6},{id:'turkey',name:'Roast Turkey',emoji:'🍗',ingredient:'🍗',actions:['Season turkey','Baste turkey'],cook:12},{id:'pie',name:'Pumpkin Pie',emoji:'🥧',ingredient:'🎃',actions:['Mix filling','Fill crust'],cook:10},{id:'beans',name:'Green Beans',emoji:'🥬',ingredient:'🥬',actions:['Trim beans','Stir beans'],cook:6},{id:'stuffing',name:'Stuffing',emoji:'🍞',ingredient:'🍞',actions:['Chop bread','Mix stuffing'],cook:8},{id:'cranberry',name:'Cranberry Sauce',emoji:'🍒',ingredient:'🍒',actions:['Add cranberries','Stir sauce'],cook:7}];
const opponents=[{name:'Brisket',image:'brisket.png'},{name:'Pumpkin',image:'pumpkin.png'},{name:'Tiny',image:'tiny.png'},{name:'Oreo',image:'oreo.png'}];let mode='rush',lastMode='rush',score=0,earned=0,seconds=120,rival=0,current=null,stage='idle',actionIndex=0,actionCount=0,round=0,active=false,finishing=false,ovenOpen=false,cookLeft=0,gameTimer=null,cookTimer=null,rivalTicks=0,token=0,judging=false,dishStarted=0;
const read=k=>{try{return Math.max(0,Number(localStorage.getItem(k))||0)}catch{return 0}},write=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
function show(id){screens.forEach(s=>$(s).hidden=s!==id)}function clearTimers(){clearInterval(gameTimer);clearInterval(cookTimer);gameTimer=null;cookTimer=null}function reset(){token++;clearTimers();active=false;finishing=false;ovenOpen=false;$('ovenDoor').classList.remove('open');$('oven').classList.remove('cooking')}
function home(){reset();document.body.classList.remove('compactCooking');$('recipeModal').hidden=true;$('showdown').hidden=true;show('home');$('bank').textContent=read('turkeyVoidyCoins');$('best').textContent=read('turkeyVoidyBest')}
function fmt(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function update(){$('clock').textContent=mode==='free'?'∞':fmt(Math.max(0,seconds));$('plates').textContent=mode==='faceoff'?score+'/5':score;$('earned').textContent=earned;$('rivalScore').textContent=rival+'/5';$('rivalBar').style.width=Math.min(100,rival*20)+'%'}
function instruction(s){$('instruction').textContent=s;$('speech').textContent=s}function speech(s){$('speech').textContent=s}function progress(v){$('progressFill').style.width=Math.max(0,Math.min(100,v))+'%'}function actions(...buttons){$('actions').replaceChildren();buttons.forEach(([name,fn])=>{let b=document.createElement('button');b.textContent=name;b.onclick=fn;$('actions').append(b)})}function trayClear(){$('ingredientTray').replaceChildren();$('bowl').replaceChildren();$('bowl').textContent='🥣';$('bowl').classList.remove('hasIngredient')}function setStage(s){stage=s;$('stepLabel').textContent=({ingredient:'FRIDGE',prep:'PREP',oven:'OVEN',cooking:'BAKING',remove:'REMOVE',plate:'PLATE',idle:'READY'})[s]||s.toUpperCase()}
function start(m){reset();judging=false;$('showdown').hidden=true;$('recipeModal').hidden=true;document.body.classList.toggle('compactCooking',m!=='free');mode=lastMode=m;score=earned=rival=round=rivalTicks=0;seconds=m==='faceoff'?180:120;active=true;$('modeName').textContent=m==='rush'?'Dinner Rush':m==='free'?'Free Cook':'Feasting Face-Off';$('rival').hidden=m!=='faceoff';$('skipBtn').hidden=m!=='free';$('recipeButtons').hidden=m!=='free';const opponent=opponents[Math.floor(Math.random()*opponents.length)];$('rivalName').textContent=opponent.name;$('rivalPortrait').src='Images/'+opponent.image;$('rivalPortrait').alt=opponent.name;$('recipeButtons').replaceChildren();$('modalRecipes').replaceChildren();recipes.forEach(r=>{const b=document.createElement('button');b.textContent=r.emoji+' '+r.name;b.onclick=()=>{if(active)pick(r)};$('recipeButtons').append(b);const mb=b.cloneNode(true);mb.onclick=()=>{if(active){$('recipeModal').hidden=true;pick(r)}};$('modalRecipes').append(mb)});show('play');update();if(m==='free'){current=null;setStage('idle');$('order').textContent='Choose a Thanksgiving dish';instruction('Tap Choose recipe to start.');actions();trayClear();$('dish').textContent='🍽️';$('recipeModal').hidden=false}else pickRandom();if(m!=='free')gameTimer=setInterval(()=>{if(!active||judging)return;seconds--;rivalTicks++;if(mode==='faceoff'&&rivalTicks%28===0){rival++;speech('The family is cooking too!')}update();if(mode==='faceoff'&&rival>=5)finish(false);else if(seconds<=0)finish(mode!=='faceoff'||score>rival)},1000)}
function pickRandom(){pick(recipes[Math.floor(Math.random()*recipes.length)])}
function pick(r){dishStarted=Date.now();token++;clearInterval(cookTimer);$('oven').classList.remove('cooking');ovenOpen=false;$('ovenDoor').classList.remove('open');current=r;round++;actionIndex=actionCount=0;$('order').textContent=(mode==='free'?'Recipe: ':'Dish #'+round+': ')+r.emoji+' '+r.name;$('dish').textContent='🍽️';progress(0);speech('Let’s get cooking!');[...$('recipeButtons').children].forEach((b,i)=>b.classList.toggle('selected',recipes[i]===r));setStage('ingredient');instruction('Tap the fridge to collect '+r.name.toLowerCase()+' ingredients!');actions();trayClear()}
function openFridge(){
 if(!active||stage!=='ingredient')return;
 instruction('Drag the ingredient from the bowl onto the cutting board!');
 actions();trayClear();
 const item=document.createElement('span');
 item.className='counterIngredient';item.textContent=current.ingredient;
 item.setAttribute('role','button');item.setAttribute('tabindex','0');
 item.setAttribute('aria-label','Move '+current.name+' ingredient to cutting board');
 $('bowl').replaceChildren(item);$('bowl').classList.add('hasIngredient');
 item.addEventListener('click',()=>{if(stage==='ingredient')takeIngredient()});
 item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();takeIngredient()}});
 let origin=null,ghost=null;
 item.addEventListener('pointerdown',e=>{
   if(stage!=='ingredient')return;
   e.preventDefault();origin={x:e.clientX,y:e.clientY};
   item.setPointerCapture(e.pointerId);
   ghost=item.cloneNode(true);ghost.className='ingredientGhost';
   document.body.appendChild(ghost);ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
 });
 item.addEventListener('pointermove',e=>{
   if(!origin||!ghost)return;
   ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
   $('board').classList.toggle('dropTarget',insideBoard(e.clientX,e.clientY));
 });
 item.addEventListener('pointerup',e=>{
   if(!origin)return;
   const hit=insideBoard(e.clientX,e.clientY);
   ghost?.remove();ghost=null;origin=null;$('board').classList.remove('dropTarget');
   if(hit)takeIngredient();else instruction('Drag the ingredient onto the cutting board!');
 });
 item.addEventListener('pointercancel',()=>{ghost?.remove();ghost=null;origin=null;$('board').classList.remove('dropTarget')});
}
function insideBoard(x,y){const r=$('board').getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
function takeIngredient(){if(stage!=='ingredient')return;trayClear();$('dish').textContent=current.ingredient;setStage('prep');actionIndex=actionCount=0;renderPrep()}
function renderPrep(){if(!active||stage!=='prep')return;if(actionIndex>=current.actions.length){setStage('oven');instruction('Open the oven door, then put your dish inside.');speech('Ready for the oven!');progress(0);actions();return}const name=current.actions[actionIndex],needed=6;instruction(name+' — tap the food on the cutting board!');actions();progress(0)}
function prepTap(){if(stage!=='prep'||!active)return;actionCount++;$('dish').style.transform='rotate('+((actionCount%2?1:-1)*8)+'deg) scale(1.07)';setTimeout(()=>$('dish').style.transform='',120);progress(actionCount/6*100);if(actionCount>=6){actionIndex++;actionCount=0;speech('Looking delicious!');renderPrep()}}
function toggleOven(){if(!active||!['oven','remove'].includes(stage))return;ovenOpen=!ovenOpen;$('ovenDoor').classList.toggle('open',ovenOpen);if(stage==='oven'){if(ovenOpen){instruction('Oven open! Drag the food into the oven, or tap the oven again.');actions();$('dish').classList.add('readyToDrag')}else{instruction('Open the oven door to put the dish inside.');actions()}}else if(stage==='remove'){if(ovenOpen){instruction('Oven open! Tap the oven to take out your food.');actions()}else{instruction('Open the oven to remove your food.');actions()}}}
function insertDish(){if(stage!=='oven'||!ovenOpen)return;ovenOpen=false;$('ovenDoor').classList.remove('open');$('oven').classList.add('cooking');$('ovenWindow').textContent=current.emoji;$('dish').textContent='🥣';$('dish').classList.remove('readyToDrag');setStage('cooking');cookLeft=current.cook;const id=token;instruction('Your '+current.name.toLowerCase()+' is baking! '+cookLeft+'s remaining.');speech('Watch that oven!');actions();progress(0);cookTimer=setInterval(()=>{if(!active||id!==token)return;--cookLeft;progress((current.cook-cookLeft)/current.cook*100);instruction('Baking '+current.name.toLowerCase()+'... '+Math.max(0,cookLeft)+'s');if(cookLeft<=0){clearInterval(cookTimer);$('oven').classList.remove('cooking');setStage('remove');instruction('Ding! Open the oven and remove the dish!');speech('It’s ready!');actions()}},1000)}
function removeDish(){if(stage!=='remove'||!ovenOpen)return;ovenOpen=false;$('ovenDoor').classList.remove('open');$('ovenWindow').textContent='♨';$('dish').textContent=current.emoji;setStage('plate');instruction('Plate your finished '+current.name.toLowerCase()+'!');speech('Almost done!');instruction('Tap the food on the board to plate and serve!');actions();progress(100)}
function complete(){if(!active||stage!=='plate'||judging)return;
 judging=true;setStage('judging');actions();trayClear();
 const elapsed=(Date.now()-dishStarted)/1000;
 const win=elapsed<=55;
 const overlay=$('showdown'),msg=$('showdownMessage');
 $('showdownRival').src='Images/brisket.png';msg.textContent='Calculating winner...';
 overlay.hidden=false;overlay.className='showdown entering';
 const id=token;
 setTimeout(()=>{if(!active||id!==token)return;overlay.className='showdown reveal';msg.textContent=win?'You win!':'You lose';},2600);
 setTimeout(()=>{if(!active||id!==token)return;overlay.className='showdown leaving';},4400);
 setTimeout(()=>{if(!active||id!==token)return;overlay.hidden=true;judging=false;
 score++;earned+=mode==='faceoff'?35:mode==='rush'?25:10;update();
 $('chef').classList.add('celebrate');$('sparkles').classList.add('burst');
 setTimeout(()=>{$('chef').classList.remove('celebrate');$('sparkles').classList.remove('burst')},800);
 if(mode==='faceoff'&&score>=5){finish(score>rival);return}
 if(mode==='free'){current=null;setStage('idle');$('order').textContent='Choose another Thanksgiving dish';$('dish').textContent='🍽️';instruction('Tap Choose recipe to cook again.');progress(0);$('recipeModal').hidden=false}
 else pickRandom();
 },5100);
}
function finish(win){if(!active||finishing)return;$('showdown').hidden=true;$('recipeModal').hidden=true;document.body.classList.remove('compactCooking');finishing=true;const m=mode;reset();write('turkeyVoidyCoins',read('turkeyVoidyCoins')+earned);if(m==='rush'&&score>read('turkeyVoidyBest'))write('turkeyVoidyBest',score);$('resultTitle').textContent=m==='faceoff'?(win?'Turkey Voidy Wins!':'Family Wins This Round!'):m==='free'?'Kitchen Closed!':'Dinner Rush Complete!';$('resultText').textContent=m==='faceoff'?(win?'Turkey Voidy finished five dishes first!':'Your family chef won the race. Try again!'):'What a delicious Thanksgiving feast!';$('resultNumbers').textContent=score+' dishes completed · +'+earned+' coins';show('results')}
$('fridge').onclick=()=>{if(stage==='ingredient')openFridge()};$('ovenDoor').onclick=()=>{if(stage==='oven'&&ovenOpen)insertDish();else if(stage==='remove'&&ovenOpen)removeDish();else toggleOven()};let dishDown=null,dragGhost=null;
function clearDishDrag(){
 dragGhost?.remove();dragGhost=null;dishDown=null;
 $('oven').classList.remove('dropTarget');
}
$('dish').addEventListener('pointerdown',e=>{
 if(!active||stage!=='oven'||!ovenOpen)return;
 e.preventDefault();
 dishDown={id:e.pointerId,x:e.clientX,y:e.clientY};
 try{$('dish').setPointerCapture(e.pointerId)}catch{}
 dragGhost=document.createElement('div');
 dragGhost.className='foodDragGhost';
 dragGhost.textContent=current.ingredient;
 dragGhost.style.left=e.clientX+'px';
 dragGhost.style.top=e.clientY+'px';
 document.body.appendChild(dragGhost);
});
$('dish').addEventListener('pointermove',e=>{
 if(!dishDown||e.pointerId!==dishDown.id)return;
 e.preventDefault();
 if(dragGhost){dragGhost.style.left=e.clientX+'px';dragGhost.style.top=e.clientY+'px'}
 const r=$('oven').getBoundingClientRect();
 $('oven').classList.toggle('dropTarget',e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
});
$('dish').addEventListener('pointerup',e=>{
 if(!dishDown||e.pointerId!==dishDown.id)return;
 e.preventDefault();
 const r=$('oven').getBoundingClientRect();
 const hit=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
 clearDishDrag();
 if(hit)insertDish();
 else instruction('Drag the food from the board into the open oven!');
});
$('dish').addEventListener('pointercancel',clearDishDrag);
;$('board').onclick=()=>{if(stage==='prep')prepTap();else if(stage==='plate')complete()};$('dish').addEventListener('click',e=>{e.stopPropagation();if(stage==='prep')prepTap();else if(stage==='plate')complete()});document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));$('homeBtn').onclick=()=>{if(active)finish(false);else home()};$('quitBtn').onclick=()=>finish(false);$('skipBtn').onclick=()=>{if(mode==='free'&&active){$('recipeModal').hidden=false;token++;clearInterval(cookTimer);$('oven').classList.remove('cooking');setStage('idle');current=null;trayClear();actions();$('order').textContent='Choose a recipe';instruction('Choose another dish below.');$('dish').textContent='🍽️';$('ovenWindow').textContent='♨'}};$('closeRecipes').onclick=()=>{$('recipeModal').hidden=true};$('againBtn').onclick=()=>start(lastMode);$('backBtn').onclick=home;home();
})();
