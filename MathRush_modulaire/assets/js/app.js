
      (() => {
         const $ = id => document.getElementById(id), rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a, shuffle = a => a.sort(() => Math.random() - .5);
         const screens = ['home', 'pathScreen', 'solo', 'duelSetup', 'duel', 'localMath', 'questsScreen', 'reviewScreen', 'duoGogo', 'profileScreen'];
         function show(id) { screens.forEach(s => $(s).classList.toggle('active', s === id)); window.scrollTo(0, 0); }
         document.querySelectorAll('[data-home]').forEach(b => b.onclick = () => show('home'));
         let saved = JSON.parse(localStorage.getItem('mathrush_app_save') || '{}');
         let section = saved.section || 1, level = saved.level || 1, points = saved.points || 0, done = saved.done || [], errors = saved.errors || [], soloLessons=saved.soloLessons||0, highScoreLessons=saved.highScoreLessons||0,friendGames=saved.friendGames||0,soloModeStats=saved.soloModeStats||{}, lifetimeBestStreak=saved.lifetimeBestStreak||0;
         let soloMathMode=saved.soloMathMode||'mixed';
         let modeProgress = saved.modeProgress && typeof saved.modeProgress === 'object' ? saved.modeProgress : {};
         function ensureModeTrack(mode) {
            if (!modeProgress[mode]) {
               modeProgress[mode] = mode === 'mixed'
                  ? { section: saved.section || 1, level: saved.level || 1, done: Array.isArray(saved.done) ? [...saved.done] : [] }
                  : { section: 1, level: 1, done: [] };
            }
            const track = modeProgress[mode];
            track.section = Math.max(1, Math.min(15, Number(track.section) || 1));
            track.level = Math.max(1, Math.min(15, Number(track.level) || 1));
            track.done = Array.isArray(track.done) ? track.done : [];
            return track;
         }
         function loadModeTrack() {
            const track = ensureModeTrack(soloMathMode);
            section = track.section; level = track.level; done = track.done;
         }
         loadModeTrack();
         let exIndex = 0, streak = 0, best = 0, correctCount = 0, exercise = null, choice = null, locked = false, startTime = 0;
         function persist() {
            modeProgress[soloMathMode] = { section, level, done: [...done] };
            localStorage.setItem('mathrush_app_save', JSON.stringify({
               section, level, points, done, errors, soloLessons, highScoreLessons,
               friendGames, soloMathMode, soloModeStats, modeProgress, lifetimeBestStreak
            }));
            $('totalPoints').textContent = points;
            $('homeProgress').textContent = `Section ${section} · Niveau ${level} · ${MathRushConfig.MODES.find(mode => mode.id === soloMathMode)?.label || 'Parcours'}`;
         }
         function difficultyRank() { return MathRushProgression.difficultyFor(section, level); }
         function makeMath() {
            const d = difficultyRank(); let a, b, op, ans;
            // Progression douce : additions/soustractions sans retenue au début,
            // puis tables familières (2, 3, 4, 5 et 10). Aucun décimal.
            if (d <= 2) {
               op = Math.random() < .58 ? '+' : '×';
               if (op === '+') { a = rand(1, 10); b = rand(1, Math.min(10, 20-a)); ans = a+b; }
               else { a = [2,3,4,5,10][rand(0,4)]; b = rand(2,5); ans=a*b; }
            } else if (d <= 4) {
               op = ['+','−','×'][rand(0,2)];
               if(op==='+'){a=[10,20,30,40,50][rand(0,4)];b=[5,10,20,30][rand(0,3)];ans=a+b;}
               else if(op==='−'){a=[20,30,40,50,60,80,100][rand(0,6)];b=[5,10,20,30][rand(0,3)];if(b>a)b=10;ans=a-b;}
               else {a=[2,3,4,5,10][rand(0,4)];b=rand(2,10);ans=a*b;}
            } else {
               op=['+','−','×'][rand(0,2)];
               if(op==='+'){a=rand(2,12)*10;b=rand(1,8)*10;ans=a+b;}
               else if(op==='−'){a=rand(3,15)*10;b=rand(1,a/10-1)*10;ans=a-b;}
               else {a=[2,3,4,5,10][rand(0,4)];b=rand(2,12);ans=a*b;}
            }
            return {a,b,op,ans};
         }

         function makeVisualExercise(type) {
            if (type === 'percent') {
               const pct = [5, 10, 20, 25, 50][rand(0, 4)], base = [20, 40, 60, 80, 100, 200][rand(0, 5)], ans = base * pct / 100;
               const opts = shuffle([...new Set([ans, ans + Math.max(1, base / 20), Math.max(0, ans - Math.max(1, base / 20)), ans * 2])]).slice(0, 4);
               return { type, pct, base, ans, opts };
            }
            if (type === 'model') {
               const start = rand(2, 8), step = [1,2,5][rand(0,2)], fmt = n => String(n);
               const vals = [0, 1, 2].map(i => start + i * step), ans = start + 3 * step;
               const wrong = [ans + step, ans - step, ans + 2 * step];
               return { type, vals, ans, opts: shuffle([ans, ...wrong]).map(fmt), displayVals: vals.map(fmt), displayAns: fmt(ans) };
            }
            if (type === 'factors') {
               const factors = [2, 3, 5, 7], a = factors[rand(0, 3)], b = factors[rand(0, 3)], c = factors[rand(0, 3)], missing = [a, b, c][rand(0, 2)];
               const known = [a, b, c].filter((v, i) => i !== [a, b, c].indexOf(missing));
               return { type, a, b, c, missing, known, ans: missing, opts: shuffle([...new Set([missing, missing + 1, missing + 2, Math.max(2, missing - 1)])]) };
            }
            if (type === 'equation') {
               const target = [12, 15, 18, 20, 24, 30, 36][rand(0, 6)], pairs = [];
               for (let a = 2; a <= 9; a++)if (target % a === 0) pairs.push([a, target / a]);
               const pair = pairs[rand(0, pairs.length - 1)], good = `${pair[0]} × ${pair[1]}`;
               const opts = shuffle([good, `${target} ÷ 2`, `${Math.max(1, pair[0] - 1)} × ${pair[1]}`, `${pair[0]} + ${pair[1]}`]);
               return { type, target, ans: good, opts };
            }
         }
         const SOLO_MATH_MODES = MathRushConfig.MODES;
         // Les sélecteurs Défi et Multijoueur sont générés depuis le catalogue :
         // toute évolution de config.js est automatiquement répercutée ici.
         function renderSharedMathModeCards(containerId, selectedId, onSelect) {
            const container = $(containerId);
            if (!container) return;
            const modes = (window.MathRushConfig && Array.isArray(MathRushConfig.MODES)) ? MathRushConfig.MODES : [];
            if (!modes.length) {
               container.innerHTML = '<p class="small-note mode-load-error">Les types d’exercices n’ont pas pu être chargés. Recharge la page.</p>';
               return;
            }
            container.classList.add('math-mode-grid');
            container.innerHTML = modes.map(mode =>
               `<button class="mode-card${mode.id === selectedId ? ' selected' : ''}" type="button" aria-pressed="${mode.id === selectedId}" data-math-mode="${escapeHtml(mode.id)}"><span class="mode-mark">${escapeHtml(mode.mark || '?')}</span><strong>${escapeHtml(mode.label)}</strong><small>${escapeHtml(mode.description || '')}</small></button>`
            ).join('');
            container.querySelectorAll('[data-math-mode]').forEach(button => {
               button.addEventListener('click', () => {
                  const id = button.dataset.mathMode;
                  container.querySelectorAll('.mode-card').forEach(card => {
                     const active = card === button;
                     card.classList.toggle('selected', active);
                     card.setAttribute('aria-pressed', String(active));
                  });
                  onSelect(id);
               });
            });
         }

         function makeMath() { return MathRushExercises.makeMath(difficultyRank()); }
         function makeVisualExercise(type) { return MathRushExercises.makeVisualExercise(type, rand, shuffle); }
         function makeSoloModeExercise(selectedMode) {
            return MathRushExercises.createSoloExercise(selectedMode, difficultyRank(), rand, shuffle);
         }
         function mathStrategy(a,b,op){if(op==='×'&&b===5)return `Astuce ×5 : calcule ${a} × 10, puis divise par 2.`;if(op==='×'&&b===9)return `Astuce ×9 : calcule ${a} × 10, puis enlève ${a}.`;if(op==='×'&&b===10)return `Astuce ×10 : ajoute un zéro à ${a}.`;if(op==='+'&&b%10===0)return `Astuce : ajoute les dizaines en premier (${a} + ${b}).`;if(op==='−'&&b%10===0)return `Astuce : enlève les dizaines en premier.`;return 'Astuce : compte par bonds et repère les multiples pour calculer plus vite.';}
         function buildExercise() {
            return makeSoloModeExercise(soloMathMode);
         }
         function startSolo() { loadModeTrack(); show('solo'); exIndex = 0; streak = 0; best = 0; correctCount = 0; renderSolo(); }
         function renderSolo() {
            locked = false; choice = null; exercise = buildExercise(); startTime = Date.now();
            $('soloHelpPanel').hidden=true;$('soloHelpPanel').textContent='';
            $('soloLabel').textContent = `Section ${section} · Niveau ${level}`; $('soloCount').textContent = `Exercice ${exIndex + 1} / 15`; $('soloProgress').style.width = (exIndex / 15 * 100) + '%';
            $('soloPoints').textContent = '⭐ ' + points; $('soloStreak').textContent = '🔥 ' + streak; $('soloFeedback').className = 'feedback'; $('soloFeedback').innerHTML = ''; $('soloValidate').textContent = 'Valider'; $('soloValidate').disabled = true;
            const q = $('soloQuestion');
            const priorTip=document.getElementById('soloStrategy');if(priorTip)priorTip.remove();if(exercise.a!==undefined){const tip=document.createElement('div');tip.id='soloStrategy';tip.className='strategy-tip';tip.textContent=mathStrategy(exercise.a,exercise.b,exercise.op);q.before(tip);}
            if(exercise.type==='pairmatch'){renderSoloPairs(q);return;}
            if (exercise.type === 'commonSlider') {
               q.innerHTML = `<div class="visual-prompt"><small>Sélectionne le ${exercise.label}</small><div class="visual-equation">${exercise.a} <em>,</em> ${exercise.b}</div></div><div class="range-value" id="rangeValue">?</div><input id="soloRange" class="range" type="range" min="${exercise.min}" max="${exercise.max}" step="${exercise.step}" value="${Math.min(exercise.max, Math.max(exercise.min, exercise.ticks[1]))}"><div class="ticks">${exercise.ticks.map(n => `<span>${n}</span>`).join('')}</div>`;
               $('soloRange').oninput = e => { choice = Number(e.target.value); $('rangeValue').textContent = choice; $('soloValidate').disabled = false; };
            } else if (['slider', 'line'].includes(exercise.type)) {
               q.innerHTML = `<div class="question"><small>${exercise.type === 'line' ? 'Place le résultat sur la droite graduée' : 'Estime le résultat'}</small>${exercise.a} ${exercise.op} ${exercise.b} = ?</div><div class="range-value" id="rangeValue">?</div><input id="soloRange" class="range" type="range" min="${exercise.min}" max="${exercise.max}" step="1" value="${rand(exercise.min, exercise.max)}"><div class="ticks">${exercise.ticks.map(n => `<span>${n}</span>`).join('')}</div><p class="small-note">Le nombre choisi reste caché jusqu'à validation.</p>`;
               $('soloRange').oninput = e => { choice = Number(e.target.value); $('soloValidate').disabled = false; };
            } else if (exercise.type === 'choice') {
               q.innerHTML = `<div class="question"><small>${exercise.subLabel || (exercise.mode==='complex'?'Résous le calcul en respectant les priorités':'Choisis la bonne réponse')}</small>${exercise.prompt||`${exercise.a} ${exercise.op} ${exercise.b} = ?`}</div><div class="choices">${exercise.opts.map(n => `<button class="choice" data-v="${n}">${n}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(b => b.onclick = () => selectSolo(b.dataset.v, b));
            } else if (exercise.type === 'fill') {
               q.innerHTML = `<div class="question"><small>Complète le calcul</small>${exercise.a} ${exercise.op} ${exercise.b} = ?</div><input class="answer-input" id="fillValue" type="number" inputmode="numeric" placeholder="?">`;
               $('fillValue').oninput = e => { choice = e.target.value === '' ? null : Number(e.target.value); $('soloValidate').disabled = choice === null; };
            } else if (exercise.type === 'pattern') {
               const options = shuffle([exercise.ans, exercise.ans + 2, exercise.ans + 5, Math.max(0, exercise.ans - 3)]);
               q.innerHTML = `<div class="question"><small>Quel nombre vient ensuite ?</small>${exercise.seq.join(' · ')} · ?</div><div class="choices">${options.map(n => `<button class="choice" data-v="${n}">${n}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(b => b.onclick = () => selectSolo(Number(b.dataset.v), b));
            } else if (exercise.type === 'round') {
               const unitLabel=exercise.unit===100?'la centaine':'la dizaine';
               q.innerHTML=`<div class="question"><small>Arrondis ${unitLabel}</small><div class="round-number">${exercise.number}</div><p>Quel est le nombre arrondi à ${exercise.unit===100?'la centaine':'la dizaine'} la plus proche ?</p></div><div class="strategy-tip">${exercise.tip}</div><div class="choices visual-choices">${exercise.opts.map(n=>`<button class="choice" data-v="${n}">${n}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(b=>b.onclick=()=>selectSolo(Number(b.dataset.v),b));
            } else if (exercise.type === 'coordinates') {
               q.innerHTML=`<div class="visual-prompt"><small>Lis le repère</small>${exercise.visual}<div class="equation-slots">${exercise.prompt}</div></div><div class="choices visual-choices">${exercise.opts.map(value=>`<button class="choice" data-v="${value}">${value}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(button=>button.onclick=()=>selectSolo(button.dataset.v,button));
            } else if (exercise.type === 'percent') {
               const bars = Array.from({ length: 10 }, (_, i) => `<i class="${i < exercise.pct / 10 ? 'on' : ''}"></i>`).join('');
               q.innerHTML = `<div class="visual-prompt"><small>Calcule le pourcentage</small><div class="visual-equation">${exercise.pct}% <em>×</em> ${exercise.base} <em>=</em> ?</div><div class="percent-model">${bars}</div></div><div class="choices visual-choices">${exercise.opts.map(n => `<button class="choice" data-v="${n}">${n}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(b => b.onclick = () => selectSolo(Number(b.dataset.v), b));
            } else if (exercise.type === 'model') {
               q.innerHTML = `<div class="visual-prompt"><small>Suis le modèle</small><div class="model-grid"><div>${exercise.displayVals[0]} <em>+ ${Number((exercise.vals[1] - exercise.vals[0]).toFixed(2)).toLocaleString('fr-FR')}</em></div><div>${exercise.displayVals[1]}</div><div>${exercise.displayVals[1]} <em>+ ${Number((exercise.vals[1] - exercise.vals[0]).toFixed(2)).toLocaleString('fr-FR')}</em></div><div>${exercise.displayVals[2]}</div><div>${exercise.displayVals[2]} <em>+ ${Number((exercise.vals[1] - exercise.vals[0]).toFixed(2)).toLocaleString('fr-FR')}</em></div><div class="missing-cell">?</div></div></div><div class="choices visual-choices">${exercise.opts.map((n, i) => `<button class="choice" data-v="${n}" data-index="${i}">${n}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(b => b.onclick = () => selectSolo(b.dataset.v, b));
            } else if (exercise.type === 'factors') {
               q.innerHTML = `<div class="visual-prompt"><small>Complète avec les facteurs manquants</small><div class="factor-tree"><div class="factor-total">${exercise.a * exercise.b * exercise.c}</div><div class="factor-branches"><span>?</span><span>${exercise.known[0]} × ${exercise.known[1]}</span></div></div></div><div class="choices visual-choices">${exercise.opts.map(n => `<button class="choice" data-v="${n}">${n}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(b => b.onclick = () => selectSolo(Number(b.dataset.v), b));
            } else if (exercise.type === 'equation') {
               q.innerHTML = `<div class="visual-prompt"><small>Complète l'équation</small><div class="visual-equation">${exercise.target} <em>=</em> <strong>?</strong></div><div class="equation-slots">Choisis une expression qui donne ${exercise.target}</div></div><div class="choices visual-choices">${exercise.opts.map(n => `<button class="choice" data-v="${n}">${n}</button>`).join('')}</div>`;
               q.querySelectorAll('button').forEach(b => b.onclick = () => selectSolo(b.dataset.v, b));
            }
         }
         function soloExerciseExplanation(){
            if(!exercise)return 'Lis la consigne, repère les nombres utiles puis choisis ou saisis ta réponse.';
            if(exercise.mode==='coordinates')return `Un point se lit toujours dans l’ordre (x ; y) : d’abord sa position horizontale, puis sa position verticale. Sur ce repère, chaque carreau vaut 1 unité.`;
            if(exercise.mode==='percentages'||exercise.type==='percent')return `Un pourcentage signifie « sur 100 ». ${exercise.pct}% correspond à ${exercise.pct}/100 : multiplie ${exercise.base} par ${exercise.pct}, puis divise par 100.`;
            if(exercise.mode==='common-multiples')return `Le ${exercise.askPpcm?'PPCM':'PGCD'} compare les multiples ou les diviseurs de ${exercise.a} et ${exercise.b}. ${exercise.askPpcm?'Cherche le plus petit nombre présent dans les deux listes de multiples.':'Cherche le plus grand nombre qui divise les deux nombres sans reste.'}`;
            if(exercise.type==='round')return `Pour arrondir ${exercise.number}, regarde le chiffre juste à droite du rang demandé. S’il vaut 5 ou plus, on arrondit vers le haut ; sinon vers le bas.`;
            if(exercise.type==='pattern')return `Compare les écarts entre les nombres de la suite. La même règle doit permettre de passer d’un terme au suivant.`;
            if(exercise.type==='model')return 'Observe de combien le nombre augmente à chaque étape, puis applique exactement le même écart à la dernière case.';
            if(exercise.type==='factors')return 'Les facteurs sont les nombres que l’on multiplie entre eux. Le produit des facteurs doit rester égal au nombre total.';
            if(exercise.type==='equation')return `Teste chaque expression en effectuant le calcul : une seule donne exactement ${exercise.target}.`;
            if(exercise.type==='commonSlider')return `Déplace le curseur vers le ${exercise.label} de ${exercise.a} et ${exercise.b}. Les graduations indiquent l’échelle des valeurs possibles.`;
            if(exercise.type==='pairmatch')return 'Associe chaque calcul à son résultat. Une paire est validée lorsque les deux cartes correspondent.';
            if(exercise.op)return `Effectue l’opération ${exercise.a} ${exercise.op} ${exercise.b}. ${exercise.op==='×'?'Tu peux décomposer un facteur ou utiliser les tables.':exercise.op==='−'?'Retire d’abord les dizaines, puis les unités.':'Additionne les dizaines et les unités sans les mélanger.'}`;
            return 'Repère la règle ou l’opération demandée, puis vérifie ton résultat avant de valider.';
         }
         function soloExerciseHint(){
            if(!exercise)return 'Commence par repérer ce que la consigne te demande.';
            if(exercise.mode==='coordinates')return `Lis d’abord l’axe horizontal (x), puis l’axe vertical (y). Le point est à ${exercise.x} carreaux vers la droite et ${exercise.y} vers le haut.`;
            if(exercise.type==='percent'||exercise.mode==='percentages')return `${exercise.pct}% de ${exercise.base} : commence par calculer 10% (= ${exercise.base/10}), puis adapte ce résultat au pourcentage demandé.`;
            if(exercise.type==='round')return `Le chiffre des unités est ${String(exercise.number).slice(-1)}. Il te dit s’il faut arrondir vers le haut ou vers le bas.`;
            if(exercise.type==='pattern')return `Regarde l’écart entre ${exercise.seq[0]} et ${exercise.seq[1]} : retrouve cet écart dans la suite.`;
            if(exercise.type==='model')return `L’écart entre les deux premiers nombres est ${exercise.vals[1]-exercise.vals[0]}. Ajoute le même écart au dernier nombre affiché.`;
            if(exercise.type==='factors')return `Les facteurs déjà connus sont ${exercise.known.join(' et ')}. Leur produit doit compléter le total affiché.`;
            if(exercise.type==='equation')return `Cherche une multiplication dont le résultat est ${exercise.target}.`;
            if(exercise.askPpcm)return `Écris les premiers multiples de ${exercise.a} et de ${exercise.b} : compare les deux listes.`;
            if(exercise.mode==='common-multiples')return `Liste les diviseurs de ${exercise.a} et de ${exercise.b}, puis cherche le plus grand en commun.`;
            if(exercise.op==='×')return `Décompose ${exercise.a} ou ${exercise.b} en nombres plus faciles à multiplier.`;
            if(exercise.op==='−')return `Commence par enlever les dizaines, puis termine avec les unités.`;
            if(exercise.op==='+')return `Additionne séparément les dizaines et les unités.`;
            return 'Élimine les réponses impossibles en estimant le résultat avant de calculer précisément.';
         }
         $('soloExplain').onclick=()=>{$('soloHelpPanel').textContent=soloExerciseExplanation();$('soloHelpPanel').hidden=false;};
         $('soloHint').onclick=()=>{$('soloHelpPanel').textContent=soloExerciseHint();$('soloHelpPanel').hidden=false;};
         let soloPairSelection=[],soloPairCount=0;function renderSoloPairs(q){soloPairSelection=[];soloPairCount=0;const deck=shuffle([...exercise.pairs.map((p,i)=>({key:i,kind:'calc',text:p.label})),...exercise.pairs.map((p,i)=>({key:i,kind:'answer',text:String(p.value)}))]);q.innerHTML=`<div class="question"><small>Appuie sur les paires</small>Associe chaque calcul à son résultat</div><div class="pair-grid">${deck.map((c,i)=>`<button class="pair-card" data-key="${c.key}" data-kind="${c.kind}">${c.text}</button>`).join('')}</div><p class="small-note">Observe les multiples : ×5 finit par 0 ou 5, ×10 ajoute un zéro.</p>`;q.querySelectorAll('.pair-card').forEach(b=>b.onclick=()=>{if(locked||b.disabled||b.classList.contains('selected'))return;b.classList.add('selected');soloPairSelection.push(b);if(soloPairSelection.length===2){const [a,c]=soloPairSelection;if(a.dataset.key===c.dataset.key&&a.dataset.kind!==c.dataset.kind){a.classList.add('matched');c.classList.add('matched');a.disabled=c.disabled=true;soloPairCount++;$('soloFeedback').className='feedback show good';$('soloFeedback').textContent=`Bonne paire ! ${soloPairCount}/4`;if(soloPairCount===4){choice=1;exercise.ans=1;$('soloValidate').disabled=false;validateSolo();}}else setTimeout(()=>{a.classList.remove('selected');c.classList.remove('selected');},450);soloPairSelection=[];}});}
         function selectSolo(v, b) { if (locked) return; choice = v; document.querySelectorAll('#soloQuestion .choice').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); $('soloValidate').disabled = false; }
         function validateSolo() {
            if (locked || choice === null) return; locked = true;
            const target = exercise.ans;
            // Les options du modèle sont des nombres formatés à la française (« 5,7 ») : on convertit avant de comparer.
            let diff;
            if (typeof target === 'number') {
               const parsed = Number(String(choice).replace(/[\s\u00a0]/g, '').replace(',', '.'));
               diff = isNaN(parsed) ? 1 : Math.abs(parsed - target);
            } else diff = String(choice) === String(target) ? 0 : 1;
            const slider = ['slider', 'line', 'commonSlider'].includes(exercise.type), exact = diff === 0, near = ['slider', 'line'].includes(exercise.type) && diff > 0 && diff <= Math.max(1, target * .1), speed = Math.max(0, Math.round(20 - Math.max(0, (Date.now() - startTime) / 1000 - 4) * 2));
            const recordedModes=soloMathMode==='mixed'?[exercise.mode,'mixed']:[exercise.mode];recordedModes.forEach(mode=>{const modeStats=soloModeStats[mode]||(soloModeStats[mode]={played:0,correct:0});modeStats.played++;if(exact)modeStats.correct++;});
            let gain = 0; if (exact) { gain = 100 + speed + Math.min(40, streak * 5); streak++; correctCount++; } else if (near) { gain = 60 + Math.round(25 * (1 - diff / Math.max(1, target * .1))); streak = 0; } else streak = 0;
            points += gain; best = Math.max(best, streak); lifetimeBestStreak = Math.max(lifetimeBestStreak, best); if(!exact&&!near){errors.unshift({question:exercise.a!==undefined?`${exercise.a} ${exercise.op} ${exercise.b}`:exercise.type==='round'?`Arrondir ${exercise.number} à la dizaine/centaine la plus proche`:'Associer les calculs et leurs résultats',answer:target,tip:exercise.type==='round'?exercise.tip:exercise.a!==undefined?mathStrategy(exercise.a,exercise.b,exercise.op):'Revois les tables et les multiples pas à pas.'});errors=errors.slice(0,40);} persist();
            const fb = $('soloFeedback'); fb.className = 'feedback show ' + (exact ? 'good' : near ? 'near' : 'bad'); fb.innerHTML = exact ? `Bravo ! Réponse exacte : ${target}. <b>+${gain} points</b> ⭐` : near ? `Tout près ! La bonne réponse était ${target}. <b>+${gain} points</b> 🟠` : `Pas tout à fait. La bonne réponse était <b>${target}</b>.`;
            if (slider) { $('rangeValue').textContent = `Ta réponse : ${choice}`; $('rangeValue').style.color = exact ? 'var(--green)' : near ? 'var(--orange)' : 'var(--red)'; $('soloRange').disabled = true; }
            $('soloValidate').disabled = false; $('soloValidate').textContent = exIndex === 14 ? 'Terminer le niveau' : 'Continuer';
         }
         function nextSolo() {
            if (!locked) return;
            if (exIndex < 14) { exIndex++; renderSolo(); return; }
            const key = `${section}-${level}`; if (!done.includes(key)) done.push(key); soloLessons++;if(correctCount>=14)highScoreLessons++;
            if (level < 15) level++; else if (section < 15) { section++; level = 1; }
            persist(); renderPath(); $('soloQuestion').innerHTML = `<div class="summary"><div class="big">🏆</div><h2>Niveau terminé !</h2><p>Tu as terminé les 15 exercices.</p><p><b>${points} points</b> · ${correctCount} bonnes réponses</p><button class="btn btn-main full" id="nextLevel">Continuer le parcours</button><button class="btn btn-soft full" id="reviewFromEnd">Revoir mes erreurs</button></div>`;
            $('soloFeedback').className = 'feedback'; $('soloValidate').style.display = 'none'; $('soloSkip').style.display = 'none';
            $('nextLevel').onclick = () => { $('soloValidate').style.display = ''; $('soloSkip').style.display = ''; startSolo(); };$('reviewFromEnd').onclick=()=>{renderReview();show('reviewScreen');};
         }
         function renderPath() {
            loadModeTrack();
            $('journeyStars').textContent = points;
            $('journeyLevel').textContent = level;
            $('journeyStreak').textContent = streak;
            $('levelList').innerHTML = '';
            $('soloMathModes').innerHTML = SOLO_MATH_MODES.map(mode =>
               `<button class="mode-card math-mode-card ${mode.id===soloMathMode?'selected':''}" type="button" data-solo-math-mode="${mode.id}">
                  <span class="mode-mark">${mode.mark}</span><strong>${mode.label}</strong><small>${mode.description}</small>
               </button>`
            ).join('');
            $('soloMathModes').querySelectorAll('[data-solo-math-mode]').forEach(button => button.onclick = () => {
               soloMathMode = button.dataset.soloMathMode;
               loadModeTrack();
               persist();
               renderPath();
            });

            const milestones = MathRushProgression.getMilestones(soloMathMode, ensureModeTrack(soloMathMode));
            $('modeJourneySteps').innerHTML = milestones.map(step => `
               <article class="mode-step ${step.done ? 'is-done' : step.current ? 'is-current' : ''}">
                  <span class="mode-step-icon">${step.done ? '✓' : step.number}</span>
                  <div><strong>${step.title}</strong><small>${step.description}</small></div>
                  <span class="mode-step-range">${step.range}</span>
               </article>`).join('');

            for (let n = 1; n <= 15; n++) {
               const button = document.createElement('button');
               const isDone = done.includes(`${section}-${n}`);
               const open = n <= level;
               button.className = 'level-node ' + (isDone ? 'done' : open ? 'open' : '');
               button.disabled = !open;
               button.textContent = (isDone ? '✓ ' : '') + n;
               button.setAttribute('aria-label', `Étape ${n}${isDone ? ', terminée' : open ? ', accessible' : ', verrouillée'}`);
               button.onclick = () => { level = n; persist(); startSolo(); };
               $('levelList').appendChild(button);
            }
         }
         const playerProfile=window.PlayerProfile.mount({homeAvatar:$('homeAvatar'),preview:$('profileAvatarPreview'),displayName:$('profileDisplayName'),nameInput:$('profileName'),grid:$('avatarGrid'),uploadButton:$('chooseAvatar'),fileInput:$('avatarFile'),uploadStatus:$('avatarStatus'),saveButton:$('saveProfile')});
         function profileAvatarUrl(profile){return profile.avatar==='custom'&&profile.customAvatar?profile.customAvatar:`assets/avatar/${encodeURIComponent(String(profile.avatar||'08d694a0343943d7d0b58c1a9c17b525.jpg').replace(/^assets\/avatar\//,''))}`;}
         function renderDuelIdentity(opponent={name:'Adversaire',avatar:'3d-rendering-cartoon-man-beach.jpg'}){
            const profile=playerProfile.getProfile();$('duelMyName').textContent=profile.name;$('duelMyAvatar').src=profileAvatarUrl(profile);
            $('duelOpponentName').textContent=opponent.name||'Adversaire';$('duelOpponentAvatar').src=profileAvatarUrl(opponent);
         }
         function renderProfile(){
            playerProfile.render();
            $('profilePoints').textContent=points;$('profileLessons').textContent=soloLessons;$('profileLevel').textContent=`${section}.${level}`;
            $('profileErrors').textContent=errors.length;$('profileStreak').textContent=lifetimeBestStreak;$('profileGogo').textContent=Number(localStorage.getItem('mathrush_gogo_best')||0);
            $('profileModeStats').innerHTML=SOLO_MATH_MODES.map(mode=>{const stat=soloModeStats[mode.id]||{played:0,correct:0},accuracy=stat.played?Math.round(stat.correct/stat.played*100):0;return`<div><span>${mode.label}</span><b>${stat.correct}/${stat.played} · ${accuracy}%</b></div>`;}).join('');
            const trophyMetrics = {
               points, soloLessons, highScoreLessons, gogoBest: Number(localStorage.getItem('mathrush_gogo_best') || 0),
               section, level, errors: errors.length, bestStreak: lifetimeBestStreak, modeStats: soloModeStats
            };
            const badges = MathRushAchievements.getUnlocked(trophyMetrics);
            $('profileBadges').innerHTML = badges.length
               ? badges.map(trophy => `<span class="profile-badge" title="${trophy.description}">${trophy.icon} ${trophy.title}</span>`).join('')
               : '<p class="small-note">Tes premiers trophées apparaîtront au fil de tes parties.</p>';
         }
         $('goProfile').onclick=()=>{renderProfile();show('profileScreen');};
         $('toggleAvatarChoices').onclick=()=>{const panel=$('avatarChoicesPanel'),open=panel.hidden;panel.hidden=!open;$('toggleAvatarChoices').textContent=open?'Masquer le choix de l’avatar':'Afficher le choix de l’avatar';$('toggleAvatarChoices').setAttribute('aria-expanded',String(open));};
         $('goQuests').onclick=()=>{renderQuests();show('questsScreen');};$('pathQuests').onclick=()=>{renderQuests();show('questsScreen');};$('openReview').onclick=()=>{renderReview();show('reviewScreen');};$('goDuoGogo').onclick=()=>{show('duoGogo');if(!restorePausedGogo()){gogoLevel=gogoUnlockedLevel();renderSharedMathModeCards('gogoMathModes',gogoMathMode,setGogoMode);renderGogoLevels();resetGogo();}};$('goSolo').onclick = () => { renderPath(); show('pathScreen'); }; $('goDuel').onclick = () => { renderDuelIdentity(); updateDuelSetupMode(); renderSharedMathModeCards('duelMathModes',duelMathMode,id=>{duelMathMode=id;}); show('duelSetup'); }; $('seePath').onclick = () => { renderPath(); show('pathScreen'); };
         $('soloValidate').onclick = () => locked ? nextSolo() : validateSolo();
         $('soloSkip').onclick = () => { if (!locked) { if (exIndex < 14) { exIndex++; renderSolo(); } else nextSolo(); } };
         function renderQuests(){const items=[{title:'Termine 3 leçons',n:Math.min(3,soloLessons),goal:3},{title:'Obtiens au moins 90 % dans 3 leçons',n:Math.min(3,highScoreLessons),goal:3},{title:'Trouve 10 paires dans Duo à gogo',n:Math.min(10,Number(localStorage.getItem('mathrush_gogo_best')||0)),goal:10},{title:'Lance une partie avec un ami',n:Math.min(1,friendGames),goal:1}];$('questList').innerHTML=items.map(x=>`<div class="quest-row"><b>${x.title}</b><div class="quest-progress"><i style="width:${x.n/x.goal*100}%"></i></div><small>${x.n}/${x.goal}</small></div>`).join('');$('pathQuestPreview').innerHTML=items.slice(0,2).map(x=>`<div class="quest-preview">${x.title}<b>${x.n}/${x.goal}</b></div>`).join('');}
         function renderReview(){$('reviewList').innerHTML=errors.length?errors.map((e,i)=>`<div class="review-item"><b>${i+1}. ${e.question}</b><p>Réponse : <strong>${e.answer}</strong></p><small>${e.tip}</small></div>`).join(''):'<div class="strategy-tip">Aucune erreur enregistrée. Continue comme ça !</div>';$('reviewPractice').disabled=!errors.length;}
         $('reviewBack').onclick=()=>{renderPath();show('pathScreen');};$('reviewPractice').onclick=()=>{if(!errors.length)return;let idx=0;const ask=()=>{const e=errors[idx%errors.length];$('reviewList').innerHTML=`<div class="review-item"><b>${e.question}</b><small>${e.tip}</small></div><input class="field" id="reviewTry" inputmode="numeric" placeholder="Ta réponse"><button class="btn btn-main full" id="reviewCheck">Vérifier</button><p id="reviewResult"></p>`;$('reviewCheck').onclick=()=>{const ok=String($('reviewTry').value).trim()===String(e.answer);$('reviewResult').textContent=ok?'Bravo, tu as corrigé cette erreur !':`Pas encore : la réponse est ${e.answer}. Relis l’astuce puis réessaie.`;$('reviewResult').className=ok?'good':'bad';if(ok){errors.splice(idx%errors.length,1);persist();setTimeout(()=>{if(errors.length){idx++;ask();}else renderReview();},650);}};};ask();};
         let gogoTimer=null,gogoRemaining=90,gogoPairs=0,gogoBusy=false,gogoTarget=24,gogoQueue=[],gogoSelected=[],gogoIntroduced=new Set(),gogoAllPairs=[],gogoLevel=1,gogoStartedAt=0,gogoElapsedMs=0,gogoResumeAt=0,gogoPaused=false,gogoMathMode='quick';
         const GOGO_PROGRESS_KEY='mathrush_gogo_progress_v2';
         const GOGO_PAUSE_KEY='mathrush_gogo_paused_v1';
         function readGogoProgress(){try{return JSON.parse(localStorage.getItem(GOGO_PROGRESS_KEY)||'{}');}catch(_){return {};}}
         function saveGogoProgress(){const progress=readGogoProgress();progress[gogoMathMode]=Math.max(1,Number(progress[gogoMathMode]||1));localStorage.setItem(GOGO_PROGRESS_KEY,JSON.stringify(progress));}
         function gogoUnlockedLevel(){return Math.max(1,Number(readGogoProgress()[gogoMathMode]||1));}
         function formatGogoTime(seconds){return `${Number(seconds).toFixed(1).replace('.',',')} s`; }
         function renderGogoLevels(){const unlocked=gogoUnlockedLevel();$('gogoLevelList').innerHTML=Array.from({length:unlocked},(_,i)=>{const level=i+1;const record=Number(localStorage.getItem(`mathrush_gogo_time_${gogoMathMode}_${level}`)||0);return `<button type="button" class="gogo-level${level===gogoLevel?' selected':''}" data-gogo-level="${level}"><b>Niveau ${level}</b><small>${record?`Record : ${formatGogoTime(record)}`:'À découvrir'}</small></button>`;}).join('');$('gogoLevelList').querySelectorAll('[data-gogo-level]').forEach(button=>button.onclick=()=>{gogoLevel=Number(button.dataset.gogoLevel);renderGogoLevels();resetGogo();});}
         function setGogoMode(mode){gogoMathMode=mode;gogoLevel=gogoUnlockedLevel();renderGogoLevels();resetGogo();}
         function resetGogo(){
            localStorage.removeItem(GOGO_PAUSE_KEY);clearInterval(gogoTimer);gogoTimer=null;gogoRemaining=90;gogoPairs=0;gogoBusy=false;gogoQueue=[];gogoSelected=[];gogoIntroduced=new Set();gogoPaused=false;gogoElapsedMs=0;gogoResumeAt=0;
            const target=24+Math.min(16,(gogoLevel-1)*2),seconds=Math.max(45,90-(gogoLevel-1)*4);gogoRemaining=seconds;gogoTarget=target;$('gogoTime').textContent=String(seconds);$('gogoScore').textContent='0';$('gogoTarget').textContent=String(target);$('gogoDifficulty').textContent=`Niveau ${gogoLevel}`;
            $('gogoProgressFill').style.width='0%';['gogoStar1','gogoStar2','gogoStar3'].forEach(id=>$(id).classList.remove('earned'));
            $('gogoFeedback').className='feedback';$('gogoFeedback').textContent='';$('gogoStart').style.display='block';$('gogoBoard').innerHTML='';$('gogoSetupControls').hidden=false;$('gogoGamePanel').hidden=false;$('gogoResultPanel').hidden=true;$('gogoPausePanel').hidden=true;$('gogoPause').hidden=true;$('duoGogo').classList.remove('gogo-playing');
         }
         function makeGogoPairs(count){
            const pairs=[],seen=new Set(),rank=Math.max(0,Math.min(6,Math.floor((gogoLevel-1)/2)-1));
            let attempts=0;
            while(pairs.length<count&&attempts<count*30){
               attempts++;
               const exercise=window.MathRushExercises.createSoloExercise(gogoMathMode,rank,rand,shuffle);
               let label=exercise.prompt;
               let resultText=String(exercise.ans);
               if(exercise.mode==='coordinates' && Number.isFinite(exercise.x) && Number.isFinite(exercise.y)){label=`(${exercise.x} ; ${exercise.y})`;resultText=`x = ${exercise.x} · y = ${exercise.y}`;}
               if(exercise.mode==='percentages'){label=`${exercise.pct} % de ${exercise.base}`;resultText=String(Number(exercise.ans.toFixed(2))); }
               if(!label&&exercise.type==='round')label=`Arrondis ${exercise.number} à la ${exercise.unit===10?'dizaine':exercise.unit===100?'centaine':'millier'} près`;
               if(!label&&exercise.mode==='percentages')label=`${exercise.pct} % de ${exercise.base}`;
               if(!label&&exercise.type==='commonSlider')label=`${exercise.label} de ${exercise.a} et ${exercise.b}`;
               if(!label)label=`${exercise.mode} : ${exercise.a??''} ${exercise.op??''} ${exercise.b??''} = ?`;
               const result=resultText,key=`${label}|${result}`;
               if(seen.has(key))continue;
               seen.add(key);pairs.push({id:pairs.length,label,result,matchValue:exercise.mode==='coordinates'?`coord-${exercise.x}-${exercise.y}`:String(exercise.ans),mode:exercise.mode,visual:''});
            }
            // Repli sûr si un mode produit trop peu d'énoncés distincts.
            while(pairs.length<count){const a=rand(2,12),b=rand(2,12),label=`${a} × ${b} = ?`,result=String(a*b),key=`${label}|${result}`;if(!seen.has(key)){seen.add(key);pairs.push({id:pairs.length,label,result,matchValue:result,mode:'quick',visual:''});}}
            return shuffle(pairs);
         }
         function updateGogoProgress(){
            const pct=Math.min(100,gogoPairs/gogoTarget*100);$('gogoProgressFill').style.width=pct+'%';
            [1,2,3].forEach(n=>{if(gogoPairs>=Math.ceil(gogoTarget*n/3))$('gogoStar'+n).classList.add('earned');else $('gogoStar'+n).classList.remove('earned');});
         }
         function makeGogoCard(c){
            const b=document.createElement('button');b.className='gogo-card';b.dataset.pair=String(c.pair);b.dataset.kind=c.kind;b.dataset.matchValue=String(c.matchValue??'');if(c.kind==='calc'&&c.visual){b.innerHTML=`<span>${escapeHtml(c.text)}</span>${c.visual}`;}else b.textContent=c.text;b.onclick=()=>selectGogoCard(b);return b;
         }
         function makeGogoSlot(card){
            const slot=document.createElement('div');slot.className='gogo-slot';
            if(card)slot.appendChild(makeGogoCard(card));
            return slot;
         }
         function gogoCardFor(pair,kind){
            return {pair:String(pair.id),kind,matchValue:String(pair.matchValue??pair.result),text:kind==='calc'?pair.label:(Number.isFinite(Number(pair.result))?Number(pair.result).toLocaleString('fr-FR'):String(pair.result)),visual:''};
         }
         function drawGogoBoard(){
            const board=$('gogoBoard');board.innerHTML='';
            const first=gogoQueue.splice(0,4);
            const cards=shuffle(first.flatMap(pair=>[gogoCardFor(pair,'calc'),gogoCardFor(pair,'result')]));
            cards.forEach(card=>{gogoIntroduced.add(`${card.pair}:${card.kind}`);board.appendChild(makeGogoSlot(card));});
         }
         function syncGogoQueue(){
            while(gogoQueue.length){
               const id=String(gogoQueue[0].id);
               if(gogoIntroduced.has(`${id}:calc`)&&gogoIntroduced.has(`${id}:result`))gogoQueue.shift();
               else break;
            }
         }
         function gogoReplacementCandidates(){
            syncGogoQueue();
            const board=$('gogoBoard');
            const visiblePairs=new Set(Array.from(board.querySelectorAll('.gogo-card')).map(card=>card.dataset.pair));
            const partial=Array.from(visiblePairs).filter(id=>
               gogoIntroduced.has(`${id}:calc`)!==gogoIntroduced.has(`${id}:result`)
            );
            const upcoming=gogoQueue.slice(0,2).map(pair=>String(pair.id));
            const allowed=new Set([...partial,...upcoming]);
            const candidates=[];
            allowed.forEach(id=>{
               const pair=gogoQueue.find(item=>String(item.id)===id)||gogoAllPairs.find(item=>String(item.id)===id);
               if(!pair)return;
               ['calc','result'].forEach(kind=>{
                  const key=`${id}:${kind}`;
                  if(!gogoIntroduced.has(key))candidates.push(gogoCardFor(pair,kind));
               });
            });
            return candidates;
         }
         function refillGogoSlots(slots){
            const empty=shuffle(slots.filter(slot=>slot&&slot.isConnected&&!slot.querySelector('.gogo-card')));
            const usedPairs=new Set();
            empty.forEach(slot=>{
               let candidates=gogoReplacementCandidates();
               if(!candidates.length)return;
               // Si deux cases sont à remplir, privilégie deux duos différents pour ne pas
               // faire apparaître systématiquement les deux éléments d'une même paire ensemble.
               const diversified=candidates.filter(card=>!usedPairs.has(card.pair));
               if(diversified.length)candidates=diversified;
               const card=candidates[Math.floor(Math.random()*candidates.length)];
               gogoIntroduced.add(`${card.pair}:${card.kind}`);usedPairs.add(card.pair);
               slot.replaceChildren(makeGogoCard(card));
            });
            syncGogoQueue();
         }
         function addGogoPair(slots){
            refillGogoSlots(slots||Array.from($('gogoBoard').children).filter(slot=>!slot.querySelector('.gogo-card')));
         }
         function selectGogoCard(b){
            if(gogoPaused||gogoBusy||gogoPairs>=gogoTarget||b.disabled||b.classList.contains('matched')||gogoRemaining<=0)return;
            // Un second clic sur la même carte annule simplement sa sélection.
            if(b.classList.contains('selected')){b.classList.remove('selected');gogoSelected=gogoSelected.filter(card=>card!==b);return;}
            b.classList.add('selected');gogoSelected.push(b);
            if(gogoSelected.length!==2)return;
            gogoBusy=true;const [a,c]=gogoSelected;
            const valueA=String(a.dataset.matchValue),valueC=String(c.dataset.matchValue);
            const numericA=Number(valueA),numericC=Number(valueC);
            const sameValue=Number.isFinite(numericA)&&Number.isFinite(numericC)?numericA===numericC:valueA===valueC;
            const isCalcResult=a.dataset.kind!==c.dataset.kind&&sameValue;
            if(isCalcResult){
               a.classList.add('matched');c.classList.add('matched');
               a.disabled=true;c.disabled=true;
               $('gogoFeedback').className='feedback show good';$('gogoFeedback').textContent='✓ Paire trouvée ! Tu peux continuer.';
               // La paire reste grisée plus longtemps, mais ne bloque plus les autres cartes.
               const emptySlots=[a.parentElement,c.parentElement];
               gogoPairs++;$('gogoScore').textContent=gogoPairs;updateGogoProgress();gogoSelected=[];gogoBusy=false;
               const completedAt=gogoPairs>=gogoTarget?Date.now():0;
               if(completedAt&&gogoTimer){gogoElapsedMs+=Math.max(0,completedAt-gogoResumeAt);clearInterval(gogoTimer);gogoTimer=null;}
               setTimeout(()=>{
                  emptySlots.forEach(slot=>slot.replaceChildren());
                  if(completedAt){finishGogo(true,completedAt);return;}
                  if(gogoRemaining>0)refillGogoSlots(emptySlots);
               },1450);
            }else{
               $('gogoFeedback').className='feedback show near';$('gogoFeedback').textContent='Pas cette fois. Réessaie !';
               setTimeout(()=>{a.classList.remove('selected');c.classList.remove('selected');gogoSelected=[];gogoBusy=false;},700);
            }
         }
         function runGogoClock(){
            clearInterval(gogoTimer);gogoResumeAt=Date.now();gogoTimer=setInterval(()=>{gogoRemaining--;$('gogoTime').textContent=gogoRemaining;if(gogoRemaining<=0)finishGogo(false);},1000);
         }
         function savePausedGogo(){
            const board=Array.from($('gogoBoard').children).map(slot=>{const card=slot.querySelector('.gogo-card');return card?{pair:card.dataset.pair,kind:card.dataset.kind,matchValue:card.dataset.matchValue,text:card.textContent,matched:card.classList.contains('matched')}:null;});
            localStorage.setItem(GOGO_PAUSE_KEY,JSON.stringify({mode:gogoMathMode,level:gogoLevel,remaining:gogoRemaining,pairs:gogoPairs,target:gogoTarget,elapsed:gogoElapsedMs,allPairs:gogoAllPairs,queue:gogoQueue,introduced:[...gogoIntroduced],board}));
         }
         function restorePausedGogo(){
            let state;try{state=JSON.parse(localStorage.getItem(GOGO_PAUSE_KEY)||'null');}catch(_){state=null;}
            if(!state||!Array.isArray(state.board)||!state.board.length)return false;
            gogoMathMode=state.mode||'quick';gogoLevel=Number(state.level)||1;gogoRemaining=Number(state.remaining)||1;gogoPairs=Number(state.pairs)||0;gogoTarget=Number(state.target)||24;gogoElapsedMs=Number(state.elapsed)||0;gogoAllPairs=Array.isArray(state.allPairs)?state.allPairs:[];gogoQueue=Array.isArray(state.queue)?state.queue:[];gogoIntroduced=new Set(state.introduced||[]);gogoSelected=[];gogoBusy=false;gogoPaused=true;
            renderSharedMathModeCards('gogoMathModes',gogoMathMode,setGogoMode);renderGogoLevels();$('gogoTime').textContent=String(gogoRemaining);$('gogoScore').textContent=String(gogoPairs);$('gogoTarget').textContent=String(gogoTarget);$('gogoDifficulty').textContent=`Niveau ${gogoLevel}`;$('gogoProgressFill').style.width=`${Math.min(100,gogoPairs/gogoTarget*100)}%`;
            [1,2,3].forEach(n=>$(`gogoStar${n}`).classList.toggle('earned',gogoPairs>=Math.ceil(gogoTarget*n/3)));
            $('gogoBoard').innerHTML='';state.board.forEach(card=>{const slot=document.createElement('div');slot.className='gogo-slot';if(card){const b=makeGogoCard(card);if(card.matched){b.classList.add('matched');b.disabled=true;}slot.appendChild(b);} $('gogoBoard').appendChild(slot);});
            $('gogoSetupControls').hidden=true;$('gogoStart').style.display='none';$('gogoGamePanel').hidden=false;$('gogoResultPanel').hidden=true;$('gogoPausePanel').hidden=false;$('gogoBoard').hidden=true;$('gogoPause').hidden=true;$('duoGogo').classList.add('gogo-playing');return true;
         }
         function pauseGogo(){
            if(gogoPaused||!gogoTimer)return;
            gogoElapsedMs+=Date.now()-gogoResumeAt;clearInterval(gogoTimer);gogoTimer=null;gogoPaused=true;savePausedGogo();
            $('gogoPausePanel').hidden=false;$('gogoBoard').hidden=true;$('gogoPause').hidden=true;
         }
         function resumeGogo(){
            if(!gogoPaused)return;
            gogoPaused=false;$('gogoPausePanel').hidden=true;$('gogoBoard').hidden=false;$('gogoPause').hidden=false;runGogoClock();
         }
         function startGogo(){
            resetGogo();$('duoGogo').classList.add('gogo-playing');$('gogoSetupControls').hidden=true;$('gogoStart').style.display='none';$('gogoPause').hidden=false;gogoStartedAt=Date.now();gogoElapsedMs=0;
            gogoAllPairs=makeGogoPairs(gogoTarget);gogoQueue=[...gogoAllPairs];drawGogoBoard();runGogoClock();
         }
         function finishGogo(completed,finishedAt=Date.now()){
            if(!$('gogoResultPanel').hidden)return;localStorage.removeItem(GOGO_PAUSE_KEY);
            if(gogoTimer)gogoElapsedMs+=Math.max(0,finishedAt-gogoResumeAt);
            clearInterval(gogoTimer);gogoTimer=null;gogoPaused=false;gogoBusy=true;$('gogoPausePanel').hidden=true;$('gogoPause').hidden=true;$('gogoBoard').hidden=false;$('gogoBoard').querySelectorAll('button').forEach(b=>b.disabled=true);
            const elapsed=Math.max(0,Math.round(gogoElapsedMs/100)/10);
            const best=Math.max(gogoPairs,Number(localStorage.getItem('mathrush_gogo_best')||0));localStorage.setItem('mathrush_gogo_best',best);
            const timeKey=`mathrush_gogo_time_${gogoMathMode}_${gogoLevel}`;const previousTime=Number(localStorage.getItem(timeKey)||0);
            const improved=completed&&(!previousTime||elapsed<previousTime);
            if(improved)localStorage.setItem(timeKey,String(elapsed));
            let unlockedLevel=gogoUnlockedLevel();
            if(completed){const progress=readGogoProgress();progress[gogoMathMode]=Math.max(Number(progress[gogoMathMode]||1),gogoLevel+1);localStorage.setItem(GOGO_PROGRESS_KEY,JSON.stringify(progress));unlockedLevel=Math.max(unlockedLevel,gogoLevel+1);}
            const stars=gogoPairs>=Math.ceil(gogoTarget*2/3)?3:gogoPairs>=Math.ceil(gogoTarget/3)?2:gogoPairs>0?1:0;
            ['gogoStar1','gogoStar2','gogoStar3'].forEach((id,i)=>$(id).classList.toggle('earned',i<stars));
            let timeMessage=`Temps effectué : ${formatGogoTime(elapsed)}.`;
            if(completed){
               if(!previousTime)timeMessage+=` Premier temps enregistré !`;
               else if(improved)timeMessage+=` Nouveau record : tu gagnes ${formatGogoTime(previousTime-elapsed)} sur ton ancien temps de ${formatGogoTime(previousTime)} !`;
               else timeMessage+=` Ton record est toujours de ${formatGogoTime(previousTime)} (écart : ${formatGogoTime(elapsed-previousTime)}).`;
            }
            const resultTitle=completed?'🎉 Bravo, niveau réussi !':'⏱️ Niveau non terminé';
            const resultDetails=completed?`Tu as trouvé les ${gogoPairs}/${gogoTarget} paires. ${'⭐'.repeat(stars)}`:`Tu as trouvé ${gogoPairs}/${gogoTarget} paires. Encore un petit effort !`;
            const unlockMessage=completed?`<p class="gogo-unlocked">🔓 Niveau ${unlockedLevel} débloqué !</p>`:'';
            $('gogoFeedback').className='feedback';$('gogoFeedback').textContent='';
            $('gogoGamePanel').hidden=true;
            $('gogoResultPanel').hidden=false;
            $('gogoResultContent').innerHTML=`<div class="gogo-result-card ${completed?'success':'retry'}"><div class="gogo-result-icon">${completed?'🏆':'💪'}</div><h3>${resultTitle}</h3><p>${resultDetails}</p>${unlockMessage}<p class="gogo-time-result">${timeMessage}</p></div>`;
            $('gogoImprove').style.display='block';$('gogoImprove').textContent=completed?'Rejouer pour améliorer mon temps':'Réessayer ce niveau';
            $('gogoNext').style.display=completed?'block':'none';$('gogoNext').textContent=`Niveau ${unlockedLevel} : plus difficile`;
            renderGogoLevels();renderQuests();
         }
         $('gogoStart').onclick=startGogo;
         $('gogoPause').onclick=pauseGogo;
         $('gogoResume').onclick=resumeGogo;
         $('gogoStopPaused').onclick=()=>{resetGogo();gogoLevel=gogoUnlockedLevel();renderSharedMathModeCards('gogoMathModes',gogoMathMode,setGogoMode);renderGogoLevels();show('duoGogo');};
         $('gogoChangePaused').onclick=()=>{resetGogo();gogoLevel=gogoUnlockedLevel();renderSharedMathModeCards('gogoMathModes',gogoMathMode,setGogoMode);renderGogoLevels();};
         $('gogoImprove').onclick=()=>startGogo();
         $('gogoNext').onclick=()=>{gogoLevel=Math.min(gogoUnlockedLevel(),gogoLevel+1);renderGogoLevels();startGogo();};
         $('gogoQuit').onclick=()=>{resetGogo();gogoLevel=gogoUnlockedLevel();renderSharedMathModeCards('gogoMathModes',gogoMathMode,setGogoMode);renderGogoLevels();show('duoGogo');};
         /* DUEL : le serveur logique est l'hôte. Le premier joueur qui donne la bonne réponse clôt la manche des deux côtés. */
         /* Réseau : STUN pour la découverte directe + TURN (Open Relay Project, gratuit) en relais de secours.
            Sans TURN, deux smartphones en 4G/5G derrière des NAT stricts ne parviennent souvent pas à se connecter. */
         const PEER_OPTS = {
            config: {
               iceServers: [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:stun1.l.google.com:19302' },
                  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
                  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
               ], iceCandidateTimeout: 15000, sdpSemantics: 'unified-plan'
            }
         };
         let peer = null, conn = null, role = null, duelDiff = 2, round = 0, roundTarget = 10, duelMy = 0, duelOpp = 0, duelQ = null, roundEnded = false, answeredThisRound = false, duelLive = false, rematchPending = false, opponentLeft = false, duelAdvanceRule = 'firstCorrect', duelMathMode = 'quick', duelHostAnswered = null, duelGuestAnswered = null, duelFirstCorrectSide = null;
         const netStatus = t => $('networkStatus').textContent = t;
         const FRIENDS_KEY = 'mathrush_friends_v1';
         function getFriends() { try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]'); } catch (e) { return []; } }
         function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
         function renderFriends() {
            const box = $('friendsList'); if (!box) return; const a = getFriends();
            if (!a.length) { box.textContent = 'Aucun ami enregistré pour le moment.'; return; }
            box.innerHTML = a.map((f, i) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line)"><span><b>${escapeHtml(f.name)}</b><br><small>${escapeHtml(f.code)}</small></span><span style="display:flex;gap:5px"><button class="iconbtn" data-friend-join="${i}">Jouer</button><button class="iconbtn" data-friend-del="${i}">×</button></span></div>`).join('');
            box.querySelectorAll('[data-friend-join]').forEach(b => b.onclick = () => joinFriend(getFriends()[Number(b.dataset.friendJoin)].code));
            box.querySelectorAll('[data-friend-del]').forEach(b => b.onclick = () => { const a = getFriends(); a.splice(Number(b.dataset.friendDel), 1); localStorage.setItem(FRIENDS_KEY, JSON.stringify(a)); renderFriends(); });
         }
         function addCurrentOpponent() {
            if (!conn || !conn.peer) { alert('Code de salon indisponible.'); return; }
            const opponentId = conn.peer;
            const code = String(opponentId || '').replace(/^mathrush-/, '').toUpperCase();
            const name = prompt('Nom de cet ami :', 'Mon ami'); if (name === null) return;
            const a = getFriends().filter(f => f.code.toLowerCase() !== code.toLowerCase()); a.push({ name: name.trim() || 'Mon ami', code });
            localStorage.setItem(FRIENDS_KEY, JSON.stringify(a)); renderFriends();
            const myId = peer && peer.id ? peer.id : '';
            if (conn.open && myId) conn.send({ type: 'friendAdded', fromId: myId, fromName: 'Ton adversaire' });
            alert('Ami enregistré ! Ton adversaire a été averti et peut t’ajouter en retour.');
         }
         function makeDuelChoiceQuestion(type,prompt,answer,distractors,visual=''){
            const options=shuffle([...new Set([answer,...distractors])]).slice(0,4).map(String);
            return{choiceBased:true,type,prompt,visual,opts:options,answerIndex:options.indexOf(String(answer)),ans:String(answer)};
         }
         function duelQuestion() {
            const modes=MathRushConfig.MODES.filter(mode=>mode.id!=='mixed').map(mode=>mode.id);
            const type=duelMathMode==='mixed'?modes[rand(0,modes.length-1)]:duelMathMode;
            if(type==='quick'){
               const d=Math.max(0,duelDiff-1),base=[2,3,5,8,12,18][d],a=rand(1+d,4+d)*base,b=rand(1+d,3+d)*base,op=d<=1?'+':(Math.random()<.5?'+':'×'),answer=op==='+'?a+b:a*b,delta=Math.max(2,Math.round(answer*(.15+d*.06)));
               return makeDuelChoiceQuestion(type,`${a} ${op} ${b} = ?`,answer,[Math.max(0,answer-delta),answer+delta,answer+2*delta]);
            }
            if(type==='complex'){
               const a=rand(3,18),b=rand(2,12),c=rand(2,30),answer=a*b+c;
               return makeDuelChoiceQuestion(type,`${a} × ${b} + ${c} = ?`,answer,[answer+a,answer-a,answer+a*2]);
            }
            if(type==='rounding'){
               const unit=Math.random()<.5?10:100,number=unit===10?rand(101,989):rand(1010,9890),answer=Math.round(number/unit)*unit;
               return makeDuelChoiceQuestion(type,`Arrondis ${number} à la ${unit===10?'dizaine':'centaine'} la plus proche.`,answer,[answer-unit,answer+unit,answer+2*unit]);
            }
            if(type==='coordinates'){
               const x=rand(1,8),y=rand(1,8),label=['A','B','C','D'][rand(0,3)],visual=`<div class="coordinate-plane" role="img" aria-label="Repère quadrillé, point ${label} placé en ${x}, ${y}"><span class="coordinate-point" style="left:${x*10}%;bottom:${y*10}%">${label}</span></div>`;
               const answer=`(${x} ; ${y})`;
               return makeDuelChoiceQuestion(type,`Quelles sont les coordonnées du point ${label} ?`,answer,[`(${x-1} ; ${y})`,`(${x+1} ; ${y})`,`(${x} ; ${y+1})`],visual);
            }
            if(type==='common-multiples'||type==='multiplication-division'){
               const generated=MathRushExercises.createSoloExercise(type,Math.max(0,duelDiff-1),rand,shuffle);
               const answer=generated.ans;
               const prompt=generated.prompt || (generated.type==='commonSlider'
                  ? `Sélectionne le ${generated.label} de ${generated.a} et ${generated.b}.`
                  : `${generated.a} ${generated.op} ${generated.b} = ?`);
               const distractors=(generated.opts||[]).filter(value=>String(value)!==String(answer));
               return makeDuelChoiceQuestion(type,prompt,answer,distractors.length>=3?distractors:[Number(answer)+2,Math.max(0,Number(answer)-2),Number(answer)+5]);
            }
            const percent=[5,10,20,25,50,75][rand(0,5)],base=[40,60,80,100,120,200][rand(0,5)],answer=percent*base/100;
            const delta=Math.max(1,base/10);
            return makeDuelChoiceQuestion(type,`Combien font ${percent} % de ${base} ?`,answer,[answer+delta,Math.max(0,answer-delta),answer+delta*2]);
         }
         
         let duelMode = 'calc', burgerDeck = [], hostWrong = false, guestWrong = false;
         let localDuelMode=false,localDuelRound=0,localDuelTurn=0,localDuelPlayers=[],localDuelAnswers=[],localDuelRule='firstCorrect',localDuelHandoff=false,duelTurnSide='host',duelAnsweredSides=[];
         function updateDuelSetupMode(){
            const online=$('duelPlayMode').value==='online';
            $('onlineDuelSetup').style.display=online?'block':'none';$('localDuelSetup').style.display=online?'none':'block';
            const profile=playerProfile.getProfile();$('localDuelOpponent').value=$('localDuelOpponent').value||'Joueur 2';
            renderDuelIdentity({name:'Adversaire',avatar:'3d-rendering-cartoon-man-beach.jpg'});
         }
         $('duelPlayMode').onchange=updateDuelSetupMode;
         $('startLocalDuel').onclick=()=>{
            localDuelMode=true;duelDiff=Number($('difficulty').value);duelMathMode=duelMathMode||'quick';roundTarget=10;duelMy=0;duelOpp=0;localDuelRound=1;localDuelTurn=0;
            localDuelRule=$('duelPlayMode').value==='local'?$('localDuelRule').value:$('duelAdvanceRule').value;localDuelAnswers=[];localDuelHandoff=false;role=null;conn=null;
            const profile=playerProfile.getProfile();
            localDuelPlayers=[{name:profile.name||'Joueur 1',avatar:profile.avatar,customAvatar:profile.customAvatar||''},{name:$('localDuelOpponent').value.trim()||'Joueur 2',avatar:'3d-rendering-cartoon-man-beach.jpg',customAvatar:''}];
            renderDuelIdentity(localDuelPlayers[1]);$('duelResult').style.display='none';$('duelActions').style.display='none';renderLocalDuelAttempt();show('duel');
         };
         renderSharedMathModeCards('duelMathModes',duelMathMode,id=>{duelMathMode=id;});
         function burgerQuestion() {
            const item = burgerDeck[(round - 1) % burgerDeck.length];
            // Mélange de l'ordre des réponses pour que la bonne ne soit jamais au même endroit.
            const order = shuffle([...item.opts.keys()]);
            return { burger: true, cat: item.cat || 'SEL OU POIVRE', text: item.q, opts: order.map(i => item.opts[i]), ansIdx: order.indexOf(item.a) };
         }
         function updateDuelScore() { $('myScore').textContent = duelMy; $('opScore').textContent = duelOpp; }
         function renderDuelQuestion(q) {
            duelQ = q; roundEnded = false; answeredThisRound = false; hostWrong = false; guestWrong = false; duelHostAnswered = null; duelGuestAnswered = null; duelFirstCorrectSide = null; $('duelRoundLabel').textContent = `Manche ${round} / 10`; $('duelCountdown').textContent = ''; $('duelFeedback').className = 'feedback'; $('duelFeedback').textContent = '';
            $('duelQuestion').innerHTML = q.burger
               ? `<div class="burger-cat">${escapeHtml(q.cat)}</div><div class="burger-q">${escapeHtml(q.text)}</div>`
               : q.choiceBased ? `<div class="question"><small>${(MathRushConfig.MODES.find(mode=>mode.id===q.type)?.label)||'Exercice'}</small>${escapeHtml(q.prompt)}</div>${q.visual||''}`
               : `<div class="question"><small>Calcule le plus vite possible</small>${q.a} ${q.op} ${q.b} = ?</div>`;
            $('duelOptions').innerHTML = q.opts.map((n, i) => q.burger ? `<button class="choice" data-i="${i}">${'ABCD'[i]} · ${escapeHtml(n)}</button>` : `<button class="choice" data-i="${i}">${escapeHtml(n)}</button>`).join('');
            $('duelOptions').querySelectorAll('button').forEach(b => b.onclick = () => answerDuel(Number(b.dataset.i), b));
            updateDuelScore();
         }
         function renderLocalDuelAttempt(){
            round=localDuelRound;duelMy=localDuelPlayers[0].score||0;duelOpp=localDuelPlayers[1].score||0;
            renderDuelQuestion(duelQuestion());
            $('duelRoundLabel').textContent=`Manche ${localDuelRound} / ${roundTarget}`;
            $('duelCountdown').textContent='';$('duelActions').style.display='none';$('localDuelNext').style.display='none';
            const player=localDuelPlayers[localDuelTurn];$('duelMyName').textContent=player.name;
            $('duelMyAvatar').src=profileAvatarUrl(player);$('duelOpponentName').textContent=localDuelPlayers[1-localDuelTurn].name;
            $('duelOpponentAvatar').src=profileAvatarUrl(localDuelPlayers[1-localDuelTurn]);
         }
         function finishLocalDuelQuestion(){
            $('duelOptions').querySelectorAll('button').forEach(button=>{button.disabled=true;if(Number(button.dataset.i)===duelQ.answerIndex)button.style.border='2px solid #159b68';});
            $('duelFeedback').className='feedback show '+(localDuelAnswers.some(answer=>answer.correct)?'good':'bad');
            $('duelFeedback').textContent=`${localDuelAnswers.some(answer=>answer.correct)?'Bonne réponse !':'Aucune bonne réponse.'} Résultat : ${duelQ.ans}.`;
            $('localDuelNext').textContent=localDuelRound===10?'Voir les résultats':'Question suivante';$('localDuelNext').style.display='block';localDuelHandoff=false;
         }
         function answerLocalDuel(value){
            if(answeredThisRound||roundEnded)return;
            answeredThisRound=true;const correct=value===duelQ.answerIndex;
            localDuelAnswers.push({player:localDuelTurn,correct,at:Date.now()});
            const player=localDuelPlayers[localDuelTurn];
            $('duelOptions').querySelectorAll('button').forEach(button=>button.disabled=true);
            if(localDuelRule==='firstCorrect'){
               if(correct){player.score+=100;duelMy=localDuelPlayers[0].score;duelOpp=localDuelPlayers[1].score;updateDuelScore();roundEnded=true;finishLocalDuelQuestion();return;}
               if(localDuelAnswers.length===2){roundEnded=true;finishLocalDuelQuestion();return;}
            }else if(localDuelRule==='allAnswered'){
               if(localDuelAnswers.length===2){const right=localDuelAnswers.filter(a=>a.correct);right.forEach((a,i)=>localDuelPlayers[a.player].score+=100+(i===0?50:0));duelMy=localDuelPlayers[0].score;duelOpp=localDuelPlayers[1].score;updateDuelScore();roundEnded=true;finishLocalDuelQuestion();return;}
            }else{
               if(correct){player.score+=100;duelMy=localDuelPlayers[0].score;duelOpp=localDuelPlayers[1].score;updateDuelScore();roundEnded=true;finishLocalDuelQuestion();return;}
               if(localDuelTurn===1){roundEnded=true;finishLocalDuelQuestion();return;}
            }
            $('duelFeedback').className='feedback show '+(correct?'good':'bad');
            $('duelFeedback').textContent=correct?'Bonne réponse enregistrée.':'Raté ! Cette réponse est enregistrée.';
            localDuelHandoff=true;$('localDuelNext').textContent='Joueur suivant';$('localDuelNext').style.display='block';
         }
         $('localDuelNext').onclick=()=>{
            if(localDuelHandoff){localDuelHandoff=false;localDuelTurn=1-localDuelTurn;renderLocalDuelAttempt();return;}
            if(localDuelRound>=roundTarget){localDuelMode=false;$('localDuelNext').style.display='none';showDuelSummary();$('duelActions').style.display='none';return;}
            localDuelRound++;localDuelTurn=0;localDuelAnswers=[];renderLocalDuelAttempt();
         };
         function startCountdown() {
            show('duel'); $('duelResult').style.display = 'none'; $('duelActions').style.display = 'none'; $('duelOptions').innerHTML = ''; $('duelQuestion').innerHTML = '';
            let n = 3; $('duelCountdown').textContent = n;
            const t = () => { n--; if (n > 0) { $('duelCountdown').textContent = n; setTimeout(t, 1000); } else { $('duelCountdown').textContent = 'GO !'; setTimeout(() => { if (role === 'host') hostNext(); }, 500); } };
            setTimeout(t, 1000);
         }
         function hostNext() {
            if (round >= roundTarget) { endDuel(); return; }
            round++; duelQ = duelMode === 'burger' ? burgerQuestion() : duelQuestion(); conn.send({ type: 'question', round, q: duelQ, mode: duelMode }); renderDuelQuestion(duelQ);
         }
         function answerDuel(value, btn) {
            if(localDuelMode){answerLocalDuel(value);return;}
            if (roundEnded || answeredThisRound || !conn || !conn.open) return;
            const right = duelQ.burger ? value === duelQ.ansIdx : duelQ.choiceBased ? value === duelQ.answerIndex : value === duelQ.ans;
            answeredThisRound=true;$('duelOptions').querySelectorAll('button').forEach(b=>b.disabled=true);
            if(duelAdvanceRule==='turns'){
               if(role==='host'){
                  if(right)closeRound('host');else{hostWrong=true;if(guestWrong)closeRound('draw');else{conn.send({type:'turnUpdate',next:'guest',wrong:'host'});$('duelFeedback').className='feedback show bad';$('duelFeedback').textContent='Raté ! Au tour de ton adversaire.';}}
               }else conn.send({type:'answer',right,rule:'turns'});
               return;
            }
            if(duelAdvanceRule==='allAnswered'){
               if(role==='host')recordDuelAnswer('host',right);
               else conn.send({type:'answer',right,rule:'allAnswered'});
               $('duelFeedback').className='feedback show near';$('duelFeedback').textContent='Réponse enregistrée. En attente de l’autre joueur…';return;
            }
            if(right){if(role==='host')closeRound('host');else conn.send({type:'answer',right:true,rule:'firstCorrect'});}
            else{
               if(role==='host'){hostWrong=true;$('duelFeedback').className='feedback show bad';$('duelFeedback').textContent='Raté ! Tu as consommé ta tentative.';if(guestWrong)closeRound('draw');}
               else{conn.send({type:'answer',right:false,rule:'firstCorrect'});$('duelFeedback').className='feedback show bad';$('duelFeedback').textContent='Raté ! Tu as consommé ta tentative.';}
            }
         }
         function recordDuelAnswer(side,right){
            if(side==='host')duelHostAnswered=right;else duelGuestAnswered=right;
            if(right&&duelFirstCorrectSide===null)duelFirstCorrectSide=side;
            if(duelHostAnswered!==null&&duelGuestAnswered!==null)closeRound('both');
         }
         function closeRound(winner) {
            if (roundEnded) return; roundEnded = true;
            if(winner==='host')duelMy+=100;else if(winner==='guest')duelOpp+=100;else if(winner==='both'){if(duelHostAnswered)duelMy+=100;if(duelGuestAnswered)duelOpp+=100;if(duelFirstCorrectSide==='host')duelMy+=50;else if(duelFirstCorrectSide==='guest')duelOpp+=50;}
            const goodAnswer = duelQ.burger ? ` ${'ABCD'[duelQ.ansIdx]} — ${duelQ.opts[duelQ.ansIdx]}` : duelQ.choiceBased ? duelQ.opts[duelQ.answerIndex] : duelQ.ans;
            $('duelOptions').querySelectorAll('button').forEach(b => b.disabled = true);
            $('duelFeedback').className = 'feedback show ' + (winner === 'draw' ? 'near' : 'good');
            const resultMessage=winner==='host'?'Tu as trouvé en premier !':winner==='guest'?'Ton adversaire a trouvé en premier !':winner==='both'?`Réponses reçues. ${duelHostAnswered?'Tu marques 100 points.':'Tu ne marques pas de point.'} ${duelGuestAnswered?'Ton adversaire marque 100 points.':'Ton adversaire ne marque pas de point.'}`:duelQ.burger?'Manche terminée, personne n\'a trouvé !':'Manche terminée';
            $('duelFeedback').innerHTML = resultMessage + `<br>Bonne réponse : <b>${escapeHtml(String(goodAnswer))}</b>`;
            updateDuelScore();
            conn.send({ type: 'roundEnd', winner, hostScore: role === 'host' ? duelMy : duelOpp, guestScore: role === 'guest' ? duelMy : duelOpp, answer: goodAnswer });
            if (role === 'host') setTimeout(hostNext, 2500);
         }
         function endDuel() {
            duelLive = false; conn.send({ type: 'finish', hostScore: duelMy, guestScore: duelOpp });
            showDuelSummary();
         }
         function showDuelSummary(message = '') {
            $('duelCountdown').textContent = ''; $('duelQuestion').innerHTML = ''; $('duelOptions').innerHTML = ''; $('duelResult').style.display = 'block'; $('duelActions').style.display = 'flex';
            const result = duelMy === duelOpp ? 'Égalité !' : duelMy > duelOpp ? 'Victoire !' : 'Cette fois, ton adversaire gagne';
            const won = duelMy > duelOpp, tied = duelMy === duelOpp;
            $('duelResult').className = 'summary competitive-result duel-finish-anim';
            $('duelResult').innerHTML = `<div class="finish-confetti" aria-hidden="true">${won?'🎉 ✨ 🏆 ✨ 🎉':tied?'🤝 ✨ 🤝':'💪 ⭐ 💫'}</div><div class="finish-medal">${message ? '👋' : tied ? '🤝' : won ? '🏆' : '💪'}</div><p class="finish-eyebrow">DÉFI TERMINÉ</p><h2>${message ? escapeHtml(message) : result}</h2><div class="finish-score-grid"><div><small>Ton score</small><strong>${duelMy}</strong></div><div><small>Adversaire</small><strong>${duelOpp}</strong></div></div><p class="finish-rounds">${round} manches jouées</p>`;
         }
         function prepareRematch() {
            round = 0; duelMy = 0; duelOpp = 0; opponentLeft = false; rematchPending = false; roundEnded = false; answeredThisRound = false; hostWrong = false; guestWrong = false;
            if (role === 'host' && duelMode === 'burger') burgerDeck = buildBurgerDeck();
            $('duelFeedback').className = 'feedback'; $('duelFeedback').textContent = ''; updateDuelScore(); startCountdown();
         }
         function handleData(m) {
            if (m.type === 'ready' && role === 'host') { renderDuelIdentity({name:m.name,avatar:m.avatar,customAvatar:m.customAvatar});netStatus('Adversaire connecté ! Départ dans 3 secondes.'); startCountdown(); }
            if (m.type === 'settings' && role === 'guest') { duelDiff = m.difficulty; duelMode = m.mode || 'calc'; duelMathMode=m.mathMode||'quick';roundTarget=m.roundTarget||10;duelAdvanceRule=m.advanceRule||'firstCorrect';renderDuelIdentity({name:m.hostName,avatar:m.hostAvatar,customAvatar:m.hostCustomAvatar});round = 0; duelMy = 0; duelOpp = 0; netStatus('Paramètres reçus. Départ dans 3 secondes.'); updateDuelScore(); startCountdown(); }
            if (m.type === 'question' && role === 'guest') { round = m.round; if (m.mode) duelMode = m.mode; renderDuelQuestion(m.q); }
            if (m.type === 'answer' && role === 'host' && !roundEnded) {
               if(duelAdvanceRule==='allAnswered'){recordDuelAnswer('guest',!!m.right);return;}
               if(duelAdvanceRule==='turns'){
                  if(m.right)closeRound('guest');else{guestWrong=true;if(hostWrong)closeRound('draw');else conn.send({type:'turnUpdate',next:'host',wrong:'guest'});}
                  return;
               }
               if(m.right)closeRound('guest');else{guestWrong=true;if(hostWrong)closeRound('draw');}
            }
            if(m.type==='turnUpdate'&&!roundEnded){const myTurn=(role==='host'&&m.next==='host')||(role==='guest'&&m.next==='guest');answeredThisRound=!myTurn;$('duelOptions').querySelectorAll('button').forEach(b=>b.disabled=!myTurn);$('duelFeedback').className='feedback show bad';$('duelFeedback').textContent=myTurn?'Ton adversaire a raté. À toi de jouer !':'Raté ! C’est au tour de ton adversaire.';}
            if(m.type==='allAnsweredResult'&&role==='guest'&&!roundEnded){roundEnded=true;const good=duelQ.choiceBased?duelQ.opts[duelQ.answerIndex]:duelQ.ans;$('duelFeedback').className='feedback show '+(m.guestRight?'good':'bad');$('duelFeedback').textContent=`Les deux réponses sont enregistrées. ${m.guestRight?'Tu as trouvé !':'Tu n’as pas trouvé.'} Bonne réponse : ${good}`;}
            if (m.type === 'roundEnd' && role === 'guest') {
               roundEnded = true; duelMy = m.guestScore; duelOpp = m.hostScore; updateDuelScore();
               $('duelOptions').querySelectorAll('button').forEach(b => b.disabled = true);
               $('duelFeedback').className = 'feedback show good'; $('duelFeedback').innerHTML = (m.winner === 'guest' ? 'Tu as trouvé en premier !' : m.winner === 'host' ? 'Ton adversaire a trouvé en premier !' : 'Manche terminée') + `<br>Bonne réponse : <b>${m.answer}</b>`;
            }
            if (m.type === 'finish' && role === 'guest') { duelMy = m.guestScore; duelOpp = m.hostScore; showDuelSummary(); }
            if (m.type === 'friendAdded') {
               const senderCode = String(m.fromId || '').replace(/^mathrush-/, '').toUpperCase();
               if (senderCode) {
                  const addBack = confirm('Ton adversaire vient de t’ajouter en ami ! Veux-tu l’ajouter en retour ?');
                  if (addBack) {
                     const nickname = prompt('Quel nom veux-tu lui donner ?', m.fromName || 'Mon ami');
                     if (nickname !== null) {
                        const list = getFriends().filter(f => f.code.toLowerCase() !== senderCode.toLowerCase());
                        list.push({ name: nickname.trim() || 'Mon ami', code: senderCode });
                        localStorage.setItem(FRIENDS_KEY, JSON.stringify(list)); renderFriends();
                        alert('Ami ajouté en retour ! Vous pourrez vous retrouver depuis vos listes d’amis.');
                     }
                  } else {
                     $('duelFeedback').className = 'feedback show near';
                     $('duelFeedback').textContent = 'Ton adversaire t’a ajouté en ami. Tu pourras l’ajouter plus tard depuis cette notification.';
                  }
               }
            }
            if (m.type === 'rematchRequest') {
               const ok = confirm('Ton adversaire souhaite faire une revanche. Acceptes-tu ?');
               if (ok) { conn.send({ type: 'rematchAccept' }); prepareRematch(); }
               else { conn.send({ type: 'rematchDecline' }); $('duelFeedback').className = 'feedback show near'; $('duelFeedback').textContent = 'Tu as refusé la revanche.'; }
            }
            if (m.type === 'rematchAccept' && rematchPending) prepareRematch();
            if (m.type === 'rematchDecline') { rematchPending = false; $('duelFeedback').className = 'feedback show near'; $('duelFeedback').textContent = 'Ton adversaire a décliné la revanche.'; }
            if (m.type === 'abandon') { opponentLeft = true; rematchPending = false; $('duelFeedback').className = 'feedback show near'; $('duelFeedback').textContent = 'Ton adversaire a quitté le duel.'; showDuelSummary('Ton adversaire a quitté le duel.'); }
         }

         function wire(c) {
            conn = c; c.on('open', () => {
               netStatus('Connexion établie ! Préparation du duel…');
               const profile=playerProfile.getProfile();
               if (role === 'host') { conn.send({ type: 'settings', difficulty: duelDiff, mode: duelMode, mathMode:duelMathMode, roundTarget, advanceRule:duelAdvanceRule, hostName:profile.name, hostAvatar:profile.avatar, hostCustomAvatar:profile.customAvatar||'' }); startCountdown(); }
               else conn.send({ type: 'ready', name:profile.name, avatar:profile.avatar, customAvatar:profile.customAvatar||'' });
            }); c.on('data', handleData); c.on('close', () => { netStatus('La connexion avec ton adversaire a été interrompue.'); if ($('duel').classList.contains('active') && !opponentLeft) { $('duelFeedback').className = 'feedback show near'; $('duelFeedback').textContent = 'La connexion avec ton adversaire a été interrompue.'; } }); c.on('error', () => netStatus('Erreur de connexion au salon.'));
         }
         $('createRoom').onclick = () => {
            if (!window.Peer) { netStatus('Connexion réseau indisponible. Recharge la page avec Internet.'); return; }
            duelDiff = Number($('difficulty').value); duelAdvanceRule=$('duelAdvanceRule').value;duelMathMode=duelMathMode||'quick';roundTarget=10; round = 0; duelMy = 0; duelOpp = 0; role = 'host'; hostWrong = false; guestWrong = false;
            if (duelMode === 'burger') burgerDeck = buildBurgerDeck();
            peer = new Peer('mathrush-' + Math.random().toString(36).slice(2, 8), PEER_OPTS);
            peer.on('open', id => netStatus(`Salon créé ! Partage ce code : ${id.replace('mathrush-', '').toUpperCase()}\nEn attente de ton adversaire…`));
            peer.on('connection', wire); peer.on('error', e => netStatus('Erreur réseau : ' + e.type + '. Essaie de recréer un salon.'));
         };
         $('joinRoom').onclick = () => {
            const code = $('joinCode').value.trim().toLowerCase(); if (!code) { netStatus('Entre le code du salon.'); return; }
            if (!window.Peer) { netStatus('Connexion réseau indisponible. Recharge la page avec Internet.'); return; }
            role = 'guest'; peer = new Peer(undefined, PEER_OPTS); peer.on('open', () => { netStatus('Tentative de connexion au salon… (quelques secondes selon le réseau)'); wire(peer.connect('mathrush-' + code)); }); peer.on('error', e => netStatus('Impossible de rejoindre : ' + e.type + '. Vérifie le code.'));
         };
         function leaveDuel() { if (conn && conn.open) { try { conn.send({ type: 'abandon' }); } catch (e) { } } const old = peer; peer = null; conn = null; show('home'); if (old) setTimeout(() => { try { old.destroy(); } catch (e) { } }, 350); }
         $('quitDuel').onclick = leaveDuel; $('abandon').onclick = leaveDuel; $('duelMenu').onclick = leaveDuel;
         function requestRematch() {
            if (!conn || !conn.open) { $('duelFeedback').className = 'feedback show near'; $('duelFeedback').textContent = 'La connexion est fermée. Reviens au menu pour recréer un salon.'; return; }
            if (rematchPending) return; rematchPending = true; conn.send({ type: 'rematchRequest' });
            $('duelFeedback').className = 'feedback show near'; $('duelFeedback').textContent = 'Demande de revanche envoyée. En attente de ton adversaire…';
         }
         function joinFriend(code) {
            if (!window.Peer) { netStatus('Connexion réseau indisponible. Recharge la page avec Internet.'); return; }
            role = 'guest'; if (peer) { peer.destroy(); peer = null; } peer = new Peer(undefined, PEER_OPTS);
            peer.on('open', () => wire(peer.connect('mathrush-' + String(code).trim().toLowerCase())));
            peer.on('error', e => netStatus('Impossible de rejoindre : ' + e.type + '. Vérifie que ton ami est en ligne.'));
            show('duelSetup'); netStatus('Connexion à ton ami…');
         }
         $('rematch').onclick = requestRematch;
         $('addFriend').onclick = addCurrentOpponent;
         $('homeProgress').textContent = `Section ${section} · Niveau ${level}`; $('totalPoints').textContent = points; renderPath(); renderFriends(); persist();

         // Multijoueur en ligne MathRush : 3 à 8 participants, trois règles de passage.
         const localMathScreen = $('localMath');
         if (localMathScreen) {
            const mathPlayers=[];
            let mathPeer=null,mathConnections=[],mathHost=false,mathOnlineId='',mathTurn=0,mathRound=1,mathLocalQuestion=null,mathLocalLocked=false,mathGameStarted=false,mathQuestionMode='quick',mathAdvanceRule='firstCorrect',mathAnswers={},mathTurnOrder=[];
            renderSharedMathModeCards('mathRoomModes',mathQuestionMode,id=>{mathQuestionMode=id;});
            function setMathStatus(message){$('mathRoomStatus').textContent=message;}
            function mathIdentity(){const profile=playerProfile.getProfile();return{name:profile.name||'Joueur',avatar:profile.avatar,customAvatar:profile.customAvatar||''};}
            function renderMathRoster(){
               $('mathRoomRoster').style.display='block';
               $('mathRoomRoster').innerHTML=`Salon ${mathPlayers.length}/8 : ${mathPlayers.map(player=>`<img class="local-math-avatar" src="${profileAvatarUrl(player)}" alt=""> ${escapeHtml(player.name)}${$('mathTeamMode').value==='teams'?` · Équipe ${player.team+1}`:''}`).join(' · ')}`;
               $('mathHostStart').style.display=mathHost?'block':'none';$('mathHostStart').disabled=mathPlayers.length<3||mathGameStarted;
            }
            function broadcastMath(message){mathConnections.forEach(connection=>{if(connection.open)connection.send(message);});}
            function makeMathQuestion(){duelMathMode=mathQuestionMode;return duelQuestion();}
            function mathScores(){return mathPlayers.map(x=>`${$('mathTeamMode').value==='teams'?`Équipe ${x.team+1} · `:''}<img class="local-math-avatar" src="${profileAvatarUrl(x)}" alt=""> ${escapeHtml(x.name)} : <b>${x.score}</b> pts`).join(' · ');}
            function renderMathQuestion(){
               const player=mathPlayers[mathTurn];if(!player)return;
               $('mathTurn').innerHTML=`Manche ${mathRound}/10 · ${mathAdvanceRule==='turns'?'Au tour de ':''}${mathAdvanceRule==='turns'?`<img class="local-math-avatar" src="${profileAvatarUrl(player)}" alt=""> ${escapeHtml(player.name)}`:'À vous de répondre'}`;
               $('mathLocalQuestion').textContent=mathLocalQuestion.prompt;$('mathLocalVisual').innerHTML=mathLocalQuestion.visual||'';
               $('mathLocalOptions').innerHTML=mathLocalQuestion.opts.map((option,index)=>`<button class="choice" type="button" data-answer="${index}">${escapeHtml(option)}</button>`).join('');
               const canAnswer=mathAdvanceRule==='turns'?player.id===mathOnlineId:!mathAnswers[mathOnlineId];
               $('mathLocalOptions').querySelectorAll('button').forEach(button=>{button.disabled=!canAnswer||mathLocalLocked;button.onclick=()=>submitMathAnswer(Number(button.dataset.answer));});
               $('mathNextLocal').style.display='none';$('mathLocalScores').innerHTML=mathScores();
            }
            function renderMathResult(message){
               mathPlayers.splice(0,mathPlayers.length,...message.players);mathLocalLocked=true;
               $('mathLocalOptions').querySelectorAll('button').forEach(button=>{button.disabled=true;if(Number(button.dataset.answer)===message.answerIndex)button.style.border='2px solid #159b68';});
               $('mathLocalFeedback').className='feedback show '+(message.correct?'good':'bad');$('mathLocalFeedback').textContent=message.feedback|| (message.correct?'Bonne réponse !':'Raté.');$('mathLocalScores').innerHTML=mathScores();
            }
            function submitMathAnswer(answerIndex){
               if(mathLocalLocked||!mathGameStarted)return;
               const payload={type:'mathAnswer',round:mathRound,answerIndex};mathLocalLocked=true;
               $('mathLocalOptions').querySelectorAll('button').forEach(button=>button.disabled=true);
               if(mathHost)applyMathAnswer(mathOnlineId,answerIndex);else if(mathConnections[0]?.open)mathConnections[0].send(payload);
            }
            function applyMathAnswer(playerId,answerIndex){
               if(!mathHost||!mathGameStarted)return;
               const playerIndex=mathPlayers.findIndex(player=>player.id===playerId);if(playerIndex<0||mathAnswers[playerId]!==undefined)return;
               if(mathAdvanceRule==='turns'&&playerIndex!==mathTurn)return;
               const correct=Number(answerIndex)===mathLocalQuestion.answerIndex;mathAnswers[playerId]={correct,at:Date.now(),answerIndex};
               const player=mathPlayers[playerIndex];
               if(mathAdvanceRule==='firstCorrect'){
                  if(correct){player.score+=100;finishMathRound(playerId,answerIndex,`${player.name} a trouvé en premier ! +100 points`,true);return;}
                  const allDone=mathPlayers.every(p=>mathAnswers[p.id]!==undefined);
                  if(allDone){finishMathRound('',mathLocalQuestion.answerIndex,'Personne n’a trouvé. Question suivante.',false);return;}
                  broadcastMath({type:'mathAttempt',players:mathPlayers,playerId,correct:false,answerIndex});
                  if(playerId===mathOnlineId){$('mathLocalFeedback').className='feedback show bad';$('mathLocalFeedback').textContent='Raté ! Les autres joueurs peuvent encore répondre.';$('mathLocalScores').innerHTML=mathScores();}
                  return;
               }
               if(mathAdvanceRule==='allAnswered'){
                  broadcastMath({type:'mathAttempt',players:mathPlayers,playerId,correct,answerIndex});
                  if(mathPlayers.every(p=>mathAnswers[p.id]!==undefined)){
                     const winners=mathPlayers.filter(p=>mathAnswers[p.id].correct).sort((a,b)=>mathAnswers[a.id].at-mathAnswers[b.id].at);
                     winners.forEach((p,i)=>p.score+=100+(i===0?50:0));
                     finishMathRound(winners[0]?.id||'',mathLocalQuestion.answerIndex,winners.length?`${winners[0].name} reçoit le bonus de rapidité (+50 points).`:'Personne n’a trouvé.',!!winners.length);
                  }else if(playerId===mathOnlineId){$('mathLocalFeedback').className='feedback show near';$('mathLocalFeedback').textContent=correct?'Bonne réponse enregistrée. En attente des autres joueurs…':'Réponse enregistrée. En attente des autres joueurs…';}
                  return;
               }
               if(correct){player.score+=100;finishMathRound(playerId,answerIndex,`${player.name} a trouvé ! +100 points`,true);return;}
               if(mathTurn<mathPlayers.length-1){mathTurn++;mathLocalLocked=false;broadcastMath({type:'mathTurn',players:mathPlayers,turn:mathTurn,wrongPlayer:player.name});renderMathQuestion();}
               else finishMathRound('',mathLocalQuestion.answerIndex,'Tous les joueurs ont répondu. Personne n’a trouvé.',false);
            }
            function finishMathRound(winnerId,answerIndex,feedback,correct){
               const result={type:'mathAnswerResult',players:mathPlayers,answerIndex,correct,feedback,winnerId,answer:mathLocalQuestion.opts[mathLocalQuestion.answerIndex]};
               renderMathResult(result);$('mathNextLocal').style.display='block';$('mathNextLocal').textContent=mathRound===10?'Voir les résultats':'Question suivante';broadcastMath(result);
            }
            function handleMathData(connection,message){
               if(!message||typeof message!=='object')return;
               if(message.type==='mathJoin'&&mathHost&&mathGameStarted){connection.send({type:'mathRejected',reason:'La partie a déjà commencé.'});return;}
               if(message.type==='mathJoin'&&mathHost&&!mathGameStarted){
                  if(mathPlayers.length>=8){connection.send({type:'mathRejected',reason:'Le salon est complet (8 joueurs maximum).'});return;}
                  if(!mathPlayers.some(player=>player.id===connection.peer)){const team=$('mathTeamMode').value==='teams'?mathPlayers.length%2:mathPlayers.length;mathPlayers.push({id:connection.peer,name:String(message.name||'Joueur').slice(0,18),avatar:message.avatar,customAvatar:message.customAvatar||'',score:0,team});mathConnections.push(connection);}
                  connection.send({type:'mathJoined',players:mathPlayers});broadcastMath({type:'mathRoster',players:mathPlayers});renderMathRoster();setMathStatus(mathPlayers.length<3?'Il faut au moins 3 joueurs pour démarrer.':'Le salon est prêt.');return;
               }
               if(message.type==='mathRoster'&&!mathHost){mathPlayers.splice(0,mathPlayers.length,...message.players);renderMathRoster();return;}
               if(message.type==='mathJoined'&&!mathHost){mathPlayers.splice(0,mathPlayers.length,...message.players);renderMathRoster();setMathStatus('En attente du démarrage par l’hôte.');return;}
               if(message.type==='mathRejected'){setMathStatus(message.reason||'Connexion refusée.');return;}
               if(message.type==='mathAnswer'&&mathHost&&mathGameStarted){applyMathAnswer(connection.peer,message.answerIndex);return;}
               if(message.type==='mathStart'&&!mathHost){mathPlayers.splice(0,mathPlayers.length,...message.players);mathGameStarted=true;mathRound=1;mathTurn=0;mathAdvanceRule=message.advanceRule||'firstCorrect';mathAnswers={};mathLocalQuestion=message.question;$('mathRoomSetup').style.display='none';$('mathLocalPlay').style.display='block';renderMathQuestion();return;}
               if(message.type==='mathQuestion'&&!mathHost){mathRound=message.round;mathTurn=message.turn||0;mathAnswers={};mathLocalLocked=false;mathLocalQuestion=message.question;$('mathLocalFeedback').className='feedback';$('mathLocalFeedback').textContent='';renderMathQuestion();return;}
               if(message.type==='mathAttempt'&&!mathHost){mathPlayers.splice(0,mathPlayers.length,...message.players);mathAnswers[message.playerId]={correct:message.correct};$('mathLocalScores').innerHTML=mathScores();if(message.playerId===mathOnlineId){$('mathLocalFeedback').className='feedback show bad';$('mathLocalFeedback').textContent='Raté ! Les autres joueurs peuvent encore répondre.';}}
               if(message.type==='mathTurn'&&!mathHost){mathPlayers.splice(0,mathPlayers.length,...message.players);mathTurn=message.turn;mathLocalLocked=false;$('mathLocalFeedback').className='feedback show bad';$('mathLocalFeedback').textContent=`${message.wrongPlayer} s’est trompé. Au joueur suivant !`;renderMathQuestion();return;}
               if(message.type==='mathAnswerResult'&&!mathHost){renderMathResult(message);$('mathNextLocal').style.display='none';return;}
               if(message.type==='mathFinish'&&!mathHost){mathPlayers.splice(0,mathPlayers.length,...message.players);finishMathGame();return;}
            }
            function finishMathGame(){
               mathGameStarted=false;$('mathCreateRoom').disabled=false;
               const ranked=[...mathPlayers].sort((a,b)=>b.score-a.score);
               const top=ranked.slice(0,3),rest=ranked.slice(3);
               $('mathLocalQuestion').textContent='';$('mathLocalVisual').innerHTML='';$('mathLocalOptions').innerHTML='';
               $('mathLocalFeedback').className='feedback';$('mathLocalFeedback').textContent='';
               $('mathLocalScores').innerHTML='';$('mathNextLocal').style.display='none';
               $('mathRoomSetup').style.display='none';$('mathLocalPlay').style.display='block';
               $('mathPodiumResult').style.display='block';
               $('mathPodiumResult').innerHTML=`<div class="finish-confetti" aria-hidden="true">🎉 ✨ 🎊 🏆 🎊 ✨ 🎉</div><p class="finish-eyebrow">PARTIE MULTIJOUEUR TERMINÉE</p><h2>Le podium MathRush</h2><div class="podium-stage">${top.map((player,index)=>{const rank=ranked.findIndex(p=>p.score===player.score);const place=index===0?'first':index===1?'second':'third';return `<div class="podium-player podium-${place}" style="--podium-delay:${index*180}ms"><div class="podium-crown">${index===0?'👑':index===1?'🥈':'🥉'}</div><img src="${profileAvatarUrl(player)}" alt=""><strong>${escapeHtml(player.name)}</strong><b>${player.score} pts</b><span class="podium-block">${rank+1}</span></div>`;}).join('')}</div>${rest.length?`<div class="podium-rest"><h3>Classement</h3>${rest.map((player,index)=>`<div><span>${index+4}. ${escapeHtml(player.name)}</span><b>${player.score} pts</b></div>`).join('')}</div>`:''}<button class="btn btn-main full finish-menu-btn" id="mathBackToLobby" type="button">Retour au salon</button>`;
               $('mathPodiumResult').querySelector('#mathBackToLobby').onclick=()=>{$('mathPodiumResult').style.display='none';$('mathRoomSetup').style.display='block';$('mathLocalPlay').style.display='none';$('mathHostStart').style.display=mathHost?'block':'none';$('mathHostStart').disabled=mathPlayers.length<3;setMathStatus('Partie terminée. Tu peux créer un nouveau salon.');};
            }
            function nextMathQuestion(){if(!mathHost||!mathGameStarted)return;if(mathRound>=10){broadcastMath({type:'mathFinish',players:mathPlayers});finishMathGame();return;}mathRound++;mathTurn=0;mathAnswers={};mathLocalLocked=false;mathLocalQuestion=makeMathQuestion();$('mathLocalFeedback').className='feedback';$('mathLocalFeedback').textContent='';renderMathQuestion();broadcastMath({type:'mathQuestion',round:mathRound,turn:mathTurn,question:mathLocalQuestion});}
            $('goLocal').onclick=()=>{renderSharedMathModeCards('mathRoomModes',mathQuestionMode,id=>{mathQuestionMode=id;});show('localMath');$('mathRoomSetup').style.display='block';$('mathLocalPlay').style.display='none';$('mathPodiumResult').style.display='none';$('mathRoomRoster').style.display='none';$('mathHostStart').style.display='none';$('mathHostStart').disabled=true;$('mathCreateRoom').disabled=false;$('mathJoinCode').value='';const profile=playerProfile.getProfile();$('mathOnlineName').value=profile.name;setMathStatus('Un salon démarre à partir de 3 joueurs.');};
            $('localBack').onclick=()=>{if(mathPeer)mathPeer.destroy();mathPeer=null;mathConnections=[];mathHost=false;mathGameStarted=false;$('mathCreateRoom').disabled=false;show('home');};
            $('mathCreateRoom').onclick=()=>{if(!window.Peer){setMathStatus('Connexion réseau indisponible. Recharge la page avec Internet.');return;}if(mathPeer)mathPeer.destroy();mathPlayers.length=0;mathConnections=[];mathHost=true;mathGameStarted=false;const identity=mathIdentity();mathPlayers.push({...identity,id:'',score:0,team:0});setMathStatus('Création du salon…');$('mathCreateRoom').disabled=true;mathPeer=new Peer('mathrush-multi-'+Math.random().toString(36).slice(2,8));mathPeer.on('open',id=>{mathOnlineId=id;mathPlayers[0].id=id;setMathStatus(`Salon créé. Partage ce code : ${id.replace('mathrush-multi-','').toUpperCase()}`);renderMathRoster();});mathPeer.on('connection',connection=>{connection.on('data',message=>handleMathData(connection,message));connection.on('close',()=>{mathConnections=mathConnections.filter(item=>item!==connection);mathPlayers.splice(0,mathPlayers.length,...mathPlayers.filter(player=>player.id!==connection.peer));if(!mathGameStarted)renderMathRoster();});});mathPeer.on('error',error=>{setMathStatus('Erreur de salon : '+(error.type||'connexion'));$('mathCreateRoom').disabled=false;});};
            $('mathJoinRoom').onclick=()=>{const code=$('mathJoinCode').value.trim().toLowerCase();if(!code){setMathStatus('Saisis le code du salon.');return;}if(!window.Peer){setMathStatus('Connexion réseau indisponible. Recharge la page avec Internet.');return;}if(mathPeer)mathPeer.destroy();mathHost=false;mathGameStarted=false;const identity=mathIdentity();setMathStatus('Connexion au salon…');mathPeer=new Peer();mathPeer.on('open',id=>{mathOnlineId=id;const connection=mathPeer.connect('mathrush-multi-'+code,{reliable:true});mathConnections=[connection];connection.on('open',()=>connection.send({type:'mathJoin',...identity}));connection.on('data',message=>handleMathData(connection,message));connection.on('error',()=>setMathStatus('Impossible de rejoindre ce salon. Vérifie le code.'));});mathPeer.on('error',error=>setMathStatus('Connexion impossible : '+(error.type||'erreur réseau')));};
            $('mathHostStart').onclick=()=>{if(!mathHost||mathPlayers.length<3){setMathStatus('Il faut au moins 3 joueurs pour démarrer.');return;}mathAdvanceRule=$('mathAdvanceRuleMulti').value;mathPlayers.forEach(player=>player.score=0);mathRound=1;mathTurn=0;mathAnswers={};mathLocalLocked=false;mathLocalQuestion=makeMathQuestion();mathGameStarted=true;$('mathPodiumResult').style.display='none';$('mathRoomSetup').style.display='none';$('mathLocalPlay').style.display='block';renderMathQuestion();broadcastMath({type:'mathStart',players:mathPlayers,question:mathLocalQuestion,advanceRule:mathAdvanceRule});setMathStatus('La partie est lancée.');};
            $('mathNextLocal').onclick=nextMathQuestion;
         }

      })();
   