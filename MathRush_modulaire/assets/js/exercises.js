/* MathRush — générateurs d'exercices. Chaque générateur retourne un objet normalisé. */
(() => {
  'use strict';
  const pick = (items, rand) => items[rand(0, items.length - 1)];
  const unique = values => [...new Set(values)];


  function renderBaseTenBlocks(value) {
    const n = Math.max(0, Math.min(300, Math.floor(Number(value) || 0)));
    const hundreds = Math.floor(n / 100), tens = Math.floor((n % 100) / 10), units = n % 10;
    const hundredMarkup = Array.from({length:hundreds},(_,i)=>`<i class="base-ten-hundred-tile" style="--stack-index:${i}"></i>`).join('');
    const tensMarkup = Array.from({length:tens},()=>'<i class="base-ten-ten-rod"></i>').join('');
    const unitsMarkup = Array.from({length:units},()=>'<i class="base-ten-unit-cube"></i>').join('');
    return `<span class="count-blocks" role="img" aria-label="${n} blocs : ${hundreds} centaine(s), ${tens} dizaine(s), ${units} unité(s)"><span class="count-hundreds${n>200?' stacked':''}">${hundredMarkup}</span><span class="count-tens">${tensMarkup}</span><span class="count-units">${unitsMarkup}</span>${n===0?'<span class="count-empty">0 bloc</span>':''}</span>`;
  }
  function renderFactorTree(exercise) {
    return `<div class="factor-tree-visual"><div class="factor-node factor-root">${exercise.total}</div><div class="factor-tree-bracket factor-bracket-root"></div><div class="factor-tree-row"><div class="factor-subtree"><div class="factor-node missing-cell">?</div><div class="factor-tree-bracket factor-bracket-child"></div><div class="factor-tree-row compact"><div class="factor-node">${exercise.lowerA}</div><div class="factor-node">${exercise.lowerB}</div></div></div><div class="factor-node factor-leaf">${exercise.right}</div></div></div>`;
  }

  function makeMath(difficultyRank, rand) {
    const d = window.MathRushConfig.DIFFICULTY[Math.max(0, Math.min(6, difficultyRank))];
    const op = pick(d.operations, rand);
    let a, b, ans;
    if (op === '+') {
      a = rand(1, Math.max(2, Math.floor(d.maxAdd / 2)));
      b = rand(1, Math.max(1, d.maxAdd - a));
      ans = a + b;
    } else if (op === '−') {
      a = rand(2, d.maxAdd);
      b = rand(1, a - 1);
      ans = a - b;
    } else {
      a = pick(d.tables, rand);
      b = rand(2, d.maxFactor);
      ans = a * b;
    }
    return { a, b, op, ans };
  }

  function makeVisualExercise(type, rand, shuffle, rank = 6) {
    if (type === 'percent') {
      const profile = window.MathRushConfig.DIFFICULTY[2];
      const pct = pick(profile.percentages, rand), base = pick(profile.bases, rand), ans = base * pct / 100;
      const delta = Math.max(1, base / 20);
      return { type, pct, base, ans, opts: shuffle(unique([ans, ans + delta, Math.max(0, ans - delta), ans * 2])) };
    }
    if (type === 'model') {
      const start = rand(2, 5), step = rank===0?pick([1,2],rand):pick([1, 2, 5], rand);
      const vals = [0, 1, 2].map(i => start + i * step), ans = start + 3 * step;
      return { type, vals, ans, opts: shuffle([ans, ans + step, ans - step, ans + 2 * step].map(String)), displayVals: vals.map(String), displayAns: String(ans) };
    }
    if (type === 'factors') {
      const factors = [2, 3, 5, 7], values = [pick(factors, rand), pick(factors, rand), pick(factors, rand)];
      const missingIndex = rand(0, 2), missing = values[missingIndex], known = values.filter((_, i) => i !== missingIndex);
      return { type, a: values[0], b: values[1], c: values[2], missing, known, ans: missing, opts: shuffle(unique([missing, missing + 1, missing + 2, Math.max(2, missing - 1)])) };
    }
    if (type === 'equation') {
      const target = pick(rank===0?[10,12,15,20]:rank<=2?[12,15,18,20,24]:[12, 15, 18, 20, 24, 30, 36], rand), pairs = [];
      for (let a = 2; a <= 9; a++) if (target % a === 0) pairs.push([a, target / a]);
      const pair = pick(pairs, rand), good = `${pair[0]} × ${pair[1]}`;
      return { type, target, ans: good, opts: shuffle([good, `${target} ÷ 2`, `${Math.max(1, pair[0] - 1)} × ${pair[1]}`, `${pair[0]} + ${pair[1]}`]) };
    }
    throw new Error(`Type d'exercice visuel inconnu : ${type}`);
  }

  function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  // Point d'entrée unique des exercices solo et des modes qui réutilisent le catalogue.
  // Chaque branche renvoie un objet normalisé : type, mode, consigne/visuel, réponse et choix éventuels.
  function createSoloExercise(selectedMode, difficultyRank, rand, shuffle, gameContext = 'solo') {
    const mode = selectedMode === 'mixed'
      ? pick(window.MathRushConfig.MODES.filter(item => item.id !== 'mixed').map(item => item.id), rand)
      : selectedMode;
    const rank = Math.max(0, Math.min(6, difficultyRank));
    const profile = window.MathRushConfig.DIFFICULTY[rank];
    const catalog = window.MathRushConfig.EXERCISE_MODELS || [];
    const patternModes={calculation:['quick','complex','multiplication-division'],rounding:['quick','rounding'],percentage:['percentages'],missingBox:['quick','multiplication-division'],equivalent:['quick','complex'],numberModel:['quick']};
    const eligible = catalog.filter(model => model.enabled !== false && model.modes.includes(mode) && (model.type !== 'flexTemplate' || (model.contentPatterns||[]).some(pattern=>(patternModes[pattern]||[]).includes(mode))) && (model.playModes || ['solo','duel','multiplayer','gogo']).includes(gameContext) && rank >= model.difficultyMin && rank <= model.difficultyMax && model.weight > 0);
    const totalWeight = eligible.reduce((sum, model) => sum + model.weight, 0);
    let selectedModel = null;
    if (totalWeight > 0) {
      let roll = rand(1, totalWeight);
      for (const model of eligible) { roll -= model.weight; if (roll <= 0) { selectedModel = model; break; } }
    }
    const modelId = selectedModel?.id || null;
    const modelMin = Number.isFinite(Number(selectedModel?.numberMin)) ? Number(selectedModel.numberMin) : 1;
    const modelMax = Number.isFinite(Number(selectedModel?.numberMax)) ? Number(selectedModel.numberMax) : 10000;
    const tag = exercise => ({ ...exercise, modelId });

    // Modèle générique : sa structure visuelle reste stable, son contenu varie selon les catégories autorisées.
    if (selectedModel?.type === 'flexTemplate') {
      const allowed=(selectedModel.contentPatterns||['calculation']).filter(pattern=>(patternModes[pattern]||[]).includes(mode));
      const pattern=pick(allowed.length?allowed:['calculation'],rand);
      if(pattern==='rounding'){
        const unit=pick(profile.roundingUnits,rand),cap=rank===0?10:rank===1?20:rank===2?50:99,low=Math.max(2,Math.ceil(modelMin/unit)),high=Math.max(low,Math.min(cap,Math.floor(modelMax/unit))),base=rand(low,high)*unit;
        let offset=rand(-Math.floor(unit/2)+1,Math.floor(unit/2)-1);if(offset===0)offset=1;
        const number=Math.max(1,base+offset),ans=Math.round(number/unit)*unit;
        return tag({type:'round',mode,number,unit,ans,opts:shuffle(unique([ans,Math.max(0,ans-unit),ans+unit,ans+unit*2])),tip:`Arrondis à la ${unit===10?'dizaine':unit===100?'centaine':'millier'} la plus proche.`,contentPattern:pattern});
      }
      if(pattern==='percentage'){
        const pct=pick(profile.percentages,rand),eligibleBases=profile.bases.filter(v=>v>=modelMin&&v<=modelMax),base=eligibleBases.length?pick(eligibleBases,rand):Math.max(modelMin,Math.min(modelMax,profile.bases[0])),ans=base*pct/100,delta=Math.max(1,base/20);
        return tag({type:'percent',mode,pct,base,ans,opts:shuffle(unique([ans,ans+delta,Math.max(0,ans-delta),ans*2])),contentPattern:pattern});
      }
      if(pattern==='missingBox'){
        let a=rank===0?pick([2,5,10],rand):pick(profile.tables,rand),b=rand(2,rank===0?5:Math.max(3,profile.maxFactor)),product=a*b;for(let attempt=0;attempt<80&&(product<modelMin||product>modelMax);attempt++){a=rank===0?pick([2,5,10],rand):pick(profile.tables,rand);b=rand(2,rank===0?5:Math.max(3,profile.maxFactor));product=a*b;}
        return tag({type:'missingBox',mode,a,b,ans:b,prompt:`${a} × □ = ${product}`,opts:shuffle(unique([b,b+1,Math.max(1,b-1),b+2])),contentPattern:pattern});
      }
      if(pattern==='equivalent'){
        const targets=(rank===0?[10,12,15,20]:rank<=2?[12,15,18,20,24]:[12,15,18,20,24,30,36]).filter(v=>v>=modelMin&&v<=modelMax),target=targets.length?pick(targets,rand):Math.max(2,Math.min(modelMax,Math.max(modelMin,12))),pairs=[];
        for(let a=2;a<=9;a++)if(target%a===0&&target/a>=2)pairs.push([a,target/a]);
        const pair=pairs.length?pick(pairs,rand):[2,Math.max(1,Math.round(target/2))],good=`${pair[0]} × ${pair[1]}`;
        return tag({type:'equation',mode,target,ans:good,opts:shuffle(unique([good,`${target} ÷ 2`,`${Math.max(1,pair[0]-1)} × ${pair[1]}`,`${pair[0]} + ${pair[1]}`])),contentPattern:pattern});
      }
      if(pattern==='numberModel'){
        const start=Math.max(2,Math.ceil(modelMin)),maxStart=Math.max(start,Math.min(rank===0?10:40,modelMax-3)),base=rand(start,maxStart),step=pick(rank===0?[1,2]:[2,3,4,5,10],rand),vals=[base,base+step,base+step*2],ans=base+step*3;
        return tag({type:'model',mode,vals,ans,opts:shuffle(unique([ans,ans+step,Math.max(0,ans-step),ans+step*2].map(String))),displayVals:vals.map(String),displayAns:String(ans),contentPattern:pattern});
      }
      let calc=makeMath(rank,rand);for(let attempt=0;attempt<80&&(calc.ans<modelMin||calc.ans>modelMax);attempt++)calc=makeMath(rank,rand);if(calc.ans<modelMin||calc.ans>modelMax){const value=Math.max(0,Math.min(modelMax,Math.max(modelMin,2)));calc={a:value,b:0,op:'+',ans:value}}const delta=Math.max(1,Math.ceil(Math.abs(calc.ans)*.2));
      return tag({type:'choice',mode,...calc,ans:calc.ans,prompt:`${calc.a} ${calc.op} ${calc.b} = ?`,opts:shuffle(unique([calc.ans,calc.ans+delta,Math.max(0,calc.ans-delta),calc.ans+delta*2])),contentPattern:pattern});
    }
    // Variantes visuelles dédiées : elles sont réellement tirées dans les modes compatibles.
    if (selectedModel?.type === 'commonSlider') {
      let expression, ans, safeMin, safeMax;
      if (rank === 0) {
        // Tout premier palier : une opération courte, positive et immédiatement calculable.
        const examples = [{ expression:'2 × 5', ans:10 }, { expression:'10 + 10', ans:20 }, { expression:'2 × 10', ans:20 }, { expression:'5 + 5', ans:10 }];
        ({ expression, ans } = pick(examples, rand)); safeMin=0; safeMax=ans===10?20:40;
      } else if (rank <= 2) {
        const a=pick([2,3,4,5,10],rand), b=rand(2,5); ans=a*b; expression=`${a} × ${b}`; safeMin=0; safeMax=Math.max(20,Math.ceil(ans/10)*10+10);
      } else {
        let a=3,b=3,c=2,found=false;
        for(let attempt=0;attempt<80;attempt++){const sign=modelMax<=0?-1:modelMin>=0?1:(rand(0,1)?-1:1);a=rand(2,6)*sign;b=rand(2,6);c=rand(2,6);ans=a*b*c;if(ans>=modelMin&&ans<=modelMax){found=true;break;}}
        if(!found){ans=Math.min(modelMax,Math.max(modelMin,2));a=ans;b=1;c=1;}
        expression=`${a} × ${b} × ${c}`;const bound=Math.min(1000,Math.max(10,Math.abs(ans)*2));safeMin=-bound;safeMax=bound;
      }
      const span=safeMax-safeMin;
      const ticks=rank===0?[0,1,2,3,4].map(i=>Math.round(safeMax*i/4)):[safeMin,Math.round(safeMin+span*.25),Math.round(safeMin+span*.5),Math.round(safeMin+span*.75),safeMax];
      return tag({ type:'commonSlider', mode, expression, label:'résultat', ans, min:safeMin, max:safeMax, cursorStartValue:safeMin, step:1, ticks:[...new Set(ticks)] });
    }
    if (selectedModel?.type === 'factorTree') {
      const factors = [2,3,4,5,6,7,8]; let p=4,q=2,r=4,left=8,total=32;
      for(let attempt=0;attempt<80;attempt++){p=pick(factors,rand);q=pick(factors,rand);r=pick(factors,rand);left=p*q;total=left*r;if(total>=modelMin&&total<=modelMax)break;}
      if(total<modelMin||total>modelMax){p=4;q=2;r=4;left=8;total=32;}
      return tag({ type:'factorTree', mode, total, left, right:r, lowerA:p, lowerB:q, ans:left, opts:shuffle(unique([left,left+2,Math.max(2,left-1),left+5])) });
    }
    if (selectedModel?.type === 'ppcmChoice') {
      let a=2,b=3,ans=6;for(let attempt=0;attempt<80;attempt++){a=rand(2,rank<3?9:15);b=rand(2,rank<3?9:15);ans=lcm(a,b);if(ans>=modelMin&&ans<=modelMax)break;}
      return tag({ type:'ppcmChoice', mode, a, b, ans, opts:shuffle(unique([ans, ans+a, ans+b, Math.max(1,ans-gcd(a,b))])) });
    }
    if (selectedModel?.type === 'roundingTable') {
      const unit=rank>=4?100:10,offsets=unit===10?[12,21,30]:[120,210,300];
      const fixed=rand(2,8)*unit+unit*.6,rows=offsets.map(offset=>{const number=fixed+offset;const difference=number-fixed;return{number,fixed,expression:`${number} − ${fixed}`,difference,rounded:Math.round(difference/unit)*unit};});
      const last=rows[2].rounded;
      return tag({type:'roundingTable',mode,unit,rows,ans:last,opts:shuffle(unique([last,last+1,Math.max(0,last-unit),last+unit])),prompt:`Arrondis chaque résultat à la ${unit===10?'dizaine':'centaine'} près, puis fais l'opération.`});
    }
    if (selectedModel?.type === 'baseTen') {
      // Association visuelle : le nombre cible est affiché, le joueur choisit
      // entre deux cartes celle qui contient exactement autant de blocs bleus.
      const min = Math.max(0,Math.ceil(modelMin));
      const max = Math.max(min,Math.min(300,Math.floor(modelMax)));
      const ans = rand(min,max);
      const candidates = unique([ans-1,ans+1,ans-10,ans+10,ans-100,ans+100,ans===0?2:ans-2]).filter(n=>n>=min&&n<=max&&n!==ans);
      const distractor = candidates.length ? pick(candidates,rand) : (ans===max?Math.max(min,ans-1):ans+1);
      return tag({ type:'baseTen', mode, ans, opts:shuffle([ans,distractor]), numberMin:min, numberMax:max });
    }
    if (selectedModel?.type === 'baseTenRounding') {
      const number=rand(Math.max(101,modelMin),Math.min(999,modelMax)),ans=Math.round(number/100)*100;
      return tag({type:'baseTenRounding',mode,number,ans,opts:shuffle(unique([ans,Math.max(0,ans-100),ans+100]))});
    }
    if (selectedModel?.type === 'missingBox') {
      const early = rank===0;
      let a=early?pick([2,5,10],rand):pick(profile.tables,rand),b=rand(2,early?5:Math.max(3,profile.maxFactor)),product=a*b;
      for(let attempt=0;attempt<80&&(product<modelMin||product>modelMax);attempt++){a=early?pick([2,5,10],rand):pick(profile.tables,rand);b=rand(2,early?5:Math.max(3,profile.maxFactor));product=a*b;}
      // La réponse attendue est le facteur caché, jamais le produit affiché à droite.
      return tag({ type:'missingBox', mode, a, b, ans:b, prompt:`${a} × □ = ${product}`, opts:shuffle(unique([b,b+1,Math.max(1,b-1),b+2])) });
    }
    if (selectedModel?.type === 'model' || selectedModel?.type === 'factors' || selectedModel?.type === 'equation') {
      return tag({ ...makeVisualExercise(selectedModel.type,rand,shuffle,rank), mode });
    }
    if (selectedModel?.type === 'pattern') {
      const start=rand(2,rank===0?10:Math.max(4,Math.min(40,profile.maxAdd))),step=pick(rank===0?[1,2]:[2,3,4,5,10],rand),seq=[start,start+step,start+step*2];
      const ans=start+step*3;return tag({type:'pattern',mode,seq,ans,opts:shuffle(unique([ans,ans+step,ans+step*2,Math.max(0,ans-step)]))});
    }
    if (selectedModel?.type === 'round') {
      const unit=pick(profile.roundingUnits,rand),levelCap=rank===0?10:rank===1?20:rank===2?50:99,low=Math.max(2,Math.ceil(modelMin/unit)),high=Math.max(low,Math.min(levelCap,Math.floor(modelMax/unit))),base=rand(low,high)*unit;
      let offset=rand(-Math.floor(unit/2)+1,Math.floor(unit/2)-1);if(offset===0)offset=1;
      const number=Math.max(1,base+offset),ans=Math.round(number/unit)*unit;
      return tag({type:'round',mode,number,unit,ans,opts:shuffle(unique([ans,Math.max(0,ans-unit),ans+unit,ans+unit*2])),tip:`Arrondis à la ${unit===10?'dizaine':unit===100?'centaine':'millier'} la plus proche.`});
    }
    if (selectedModel?.type === 'coordinates') {
      const coordinateMax=Math.max(1,Math.min(profile.coordinateMax,modelMax)),coordinateMin=Math.max(1,Math.min(coordinateMax,modelMin));
      const x=rand(coordinateMin,coordinateMax),y=rand(coordinateMin,coordinateMax),label=['A','B','C','D'][rand(0,3)],answer=`(${x} ; ${y})`;
      const ticks=Array.from(new Set([0,Math.ceil(coordinateMax/2),coordinateMax]));
      const tickMarkup=ticks.map(value=>`<span class="coord-tick coord-x-tick" style="left:${value/coordinateMax*100}%">${value}</span>${value?`<span class="coord-tick coord-y-tick" style="bottom:${value/coordinateMax*100}%">${value}</span>`:''}`).join('')+'<span class="coord-axis-x">x</span><span class="coord-axis-y">y</span>';
      const visual=`<div class="coordinate-wrap"><div class="coordinate-plane" style="--coord-max:${coordinateMax};--coord-x:${x/coordinateMax*100}%;--coord-y:${y/coordinateMax*100}%" role="img" aria-label="Repère gradué de 0 à ${coordinateMax}, chaque carreau vaut 1 unité. Point ${label} placé en ${x}, ${y}"><span class="coordinate-point">${label}</span>${tickMarkup}</div></div>`;
      return tag({type:'coordinates',mode,x,y,coordinateMax,prompt:`Quelles sont les coordonnées du point ${label} ?`,visual,ans:answer,opts:shuffle(unique([answer,`(${Math.max(0,x-1)} ; ${y})`,`(${x+1} ; ${y})`,`(${x} ; ${y+1})`]))});
    }
    if (selectedModel?.type === 'percent') {
      const bases=profile.bases.filter(value=>value>=modelMin&&value<=modelMax),base=pick(bases.length?bases:[Math.min(modelMax,Math.max(modelMin,profile.bases[0]))],rand),pct=pick(profile.percentages,rand),ans=base*pct/100,delta=Math.max(1,base/20);
      return tag({type:'percent',mode,pct,base,ans,opts:shuffle(unique([ans,ans+delta,Math.max(0,ans-delta),ans*2]))});
    }

    if (mode === 'quick') {
      const question = makeMath(difficultyRank, rand), answer = question.ans;
      return tag({ ...question, type: 'choice', mode, prompt: `${question.a} ${question.op} ${question.b} = ?`, ans: answer,
        opts: shuffle(unique([answer, answer + 2, Math.max(0, answer - 2), answer + 5])) });
    }
    if (mode === 'complex') {
      const a = rand(...profile.complexA), b = rand(...profile.complexB), c = rand(...profile.complexC), answer = a * b + c;
      return tag({ type: 'choice', mode, prompt: `${a} × ${b} + ${c} = ?`, ans: answer,
        opts: shuffle(unique([answer, answer + a, Math.max(0, answer - a), answer + a * 2])) });
    }
    if (mode === 'rounding') {
      const unit = pick(profile.roundingUnits, rand), base = rand(2, 99) * unit;
      let offset = rand(-Math.floor(unit / 2) + 1, Math.floor(unit / 2) - 1);
      if (offset === 0) offset = 1;
      const number = Math.max(1, base + offset), answer = Math.round(number / unit) * unit;
      return tag({ type: 'round', mode, number, unit, ans: answer,
        opts: shuffle(unique([answer, Math.max(0, answer - unit), answer + unit, answer + unit * 2])),
        tip: `Arrondis à la ${unit === 10 ? 'dizaine' : unit === 100 ? 'centaine' : 'millier'} la plus proche.` });
    }
    // COORDONNÉES : x/y sont des unités du repère ; le visuel et la réponse partagent les mêmes valeurs.
    if (mode === 'coordinates') {
      const coordinateMax = profile.coordinateMax;
      const x = rand(1, coordinateMax), y = rand(1, coordinateMax), label = ['A', 'B', 'C', 'D'][rand(0, 3)], answer = `(${x} ; ${y})`;
      const ticks = Array.from(new Set([0, Math.ceil(coordinateMax / 2), coordinateMax]));
      const tickMarkup = ticks.map(value => `<span class="coord-tick coord-x-tick" style="left:${value / coordinateMax * 100}%">${value}</span>${value ? `<span class="coord-tick coord-y-tick" style="bottom:${value / coordinateMax * 100}%">${value}</span>` : ''}`).join('') + '<span class="coord-axis-x">x</span><span class="coord-axis-y">y</span>';
      const visual = `<div class="coordinate-wrap"><div class="coordinate-plane" style="--coord-max:${coordinateMax};--coord-x:${x / coordinateMax * 100}%;--coord-y:${y / coordinateMax * 100}%" role="img" aria-label="Repère gradué de 0 à ${coordinateMax}, chaque carreau vaut 1 unité. Point ${label} placé en ${x}, ${y}"><span class="coordinate-point">${label}</span>${tickMarkup}</div></div>`;
      return tag({ type: 'coordinates', mode, x, y, coordinateMax, prompt: `Quelles sont les coordonnées du point ${label} ?`, visual, ans: answer,
        opts: shuffle(unique([answer, `(${Math.max(0, x - 1)} ; ${y})`, `(${x + 1} ; ${y})`, `(${x} ; ${y + 1})`])) });
    }
    // Le modèle PGCD dédié force bien une question de diviseurs communs.
    if (selectedModel?.type === 'pgcdChoice') {
      const a=rand(4,rank<3?12:24),b=rand(4,rank<3?12:24),ans=gcd(a,b);
      return tag({type:'choice',mode,askPpcm:false,a,b,ans,prompt:`Sélectionne le plus grand commun diviseur de ${a} et ${b}.`,subLabel:'PGCD',opts:shuffle(unique([ans,ans+1,Math.max(1,ans-1),ans+2]))});
    }
    // PPCM/PGCD : une partie des tirages utilise un curseur (commonSlider), le reste des choix.
    if (mode === 'common-multiples') {
      const limit = difficultyRank <= 1 ? 6 : difficultyRank <= 3 ? 10 : difficultyRank <= 5 ? 12 : 15;
      const a = rand(2, limit), b = rand(2, limit), askPpcm = Math.random() < 0.62;
      const answer = askPpcm ? lcm(a, b) : gcd(a, b);
      const label = askPpcm ? 'plus petit commun multiple' : 'plus grand commun diviseur';
      const wrong = unique([answer + Math.max(1, Math.min(a, b)), Math.max(1, answer - Math.max(1, gcd(a, b))), answer * 2]).filter(n => n !== answer);
      const opts = shuffle([answer, ...wrong].slice(0, 3));
      if (Math.random() < 0.45) {
        const max = Math.max(answer + Math.max(a, b) * 2, 12);
        const step = max <= 30 ? 1 : 2;
        const ticks = [0, Math.round(max / 4 / step) * step, Math.round(max / 2 / step) * step, Math.round(max * 3 / 4 / step) * step, max];
        return tag({ type: 'commonSlider', mode, a, b, askPpcm, label, ans: answer, min: 0, max, step, ticks: [...new Set(ticks)] });
      }
      while (opts.length < 3) opts.push(answer + opts.length + 3);
      return tag({ type: 'choice', mode, prompt: `Sélectionne le ${label} de ${a} et ${b}.`, subLabel: askPpcm ? 'PPCM' : 'PGCD', ans: answer, opts });
    }
    if (mode === 'multiplication-division') {
      const d = window.MathRushConfig.DIFFICULTY[Math.max(0, Math.min(6, difficultyRank))];
      const useDivision = Math.random() < 0.5;
      let a, b, op, answer;
      if (useDivision) { b = pick(d.tables, rand); answer = rand(2, Math.max(3, d.maxFactor)); a = b * answer; op = '÷'; }
      else { a = pick(d.tables, rand); b = rand(2, Math.max(3, d.maxFactor)); answer = a * b; op = '×'; }
      const delta = Math.max(1, Math.min(10, Math.ceil(answer * 0.2)));
      const opts = shuffle(unique([answer, answer + delta, Math.max(0, answer - delta), answer + delta * 2]));
      return tag({ type: 'choice', mode, prompt: `${a} ${op} ${b} = ?`, subLabel: useDivision ? 'Division' : 'Multiplication', a, b, op, ans: answer, opts });
    }
    // POURCENTAGES : ans reste numérique pour que validation et affichage comparent la même valeur.
    if (mode === 'percentages') {
      const pct = pick(profile.percentages, rand), base = pick(profile.bases, rand), ans = base * pct / 100, delta = Math.max(1, base / 20);
      return tag({ type: 'percent', mode, pct, base, ans, opts: shuffle(unique([ans, ans + delta, Math.max(0, ans - delta), ans * 2])) });
    }
    throw new Error(`Mode solo inconnu : ${mode}`);
  }

  window.MathRushExercises = Object.freeze({ makeMath, makeVisualExercise, createSoloExercise, renderBaseTenBlocks, renderFactorTree, gcd, lcm });
})();
