/* Réglages stratégiques par défaut, centralisés pour faciliter l'équilibrage. */
(() => {
 const defaults={questions:15,onlineQuestions:20,pointsPerCorrectAnswer:100,answerTimeSeconds:20,voiceEnabled:true,topSignalEnabled:true,theme:"system"};
 let saved={};try{saved=JSON.parse(localStorage.getItem("drole_quizz_settings_v1")||"{}")}catch(_){}
 window.QuizConfig={...defaults,...saved,save(patch){const next={...defaults,...this,...patch};Object.keys(defaults).forEach(k=>defaults[k]=next[k]);localStorage.setItem("drole_quizz_settings_v1",JSON.stringify(defaults));Object.assign(this,patch)}};
})();
