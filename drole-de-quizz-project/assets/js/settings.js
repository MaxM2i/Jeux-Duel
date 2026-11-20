/* Préférences locales et thème clair/sombre. */
(() => {
 const $=id=>document.getElementById(id),c=window.QuizConfig;
 function theme(v){const dark=v==="dark"||(v==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=dark?"dark":"light"}
 function load(){theme(c.theme);$("themeMode").value=c.theme;$("defaultQuestionCount").value=c.questions;$("defaultTimeLimit").value=c.answerTimeSeconds;$("defaultPoints").value=c.pointsPerCorrectAnswer;$("voiceEnabled").checked=c.voiceEnabled;$("topSignalEnabled").checked=c.topSignalEnabled}
 $("openSettings").onclick=()=>{load();document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));$("settingsScreen").classList.add("active")};
 $("themeMode").onchange=e=>theme(e.target.value);
 $("saveSettings").onclick=()=>{c.save({theme:$("themeMode").value,questions:Math.min(50,Math.max(5,+$("defaultQuestionCount").value||15)),answerTimeSeconds:Math.min(180,Math.max(0,+$("defaultTimeLimit").value||0)),pointsPerCorrectAnswer:Math.min(1000,Math.max(1,+$("defaultPoints").value||100)),voiceEnabled:$("voiceEnabled").checked,topSignalEnabled:$("topSignalEnabled").checked});theme(c.theme);$("settingsStatus").textContent="Paramètres enregistrés sur cet appareil."};
 load();
})();
