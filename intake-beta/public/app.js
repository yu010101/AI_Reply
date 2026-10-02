'use strict';
const $=id=>document.getElementById(id);const qs=new URLSearchParams(location.search);let reviewUrl='';let storeName='';
const writingPrompts={general:'今日の体験で、印象に残ったことは？',food:'料理・飲み物・過ごした時間で、印象に残ったことは？',beauty:'仕上がりや施術中の過ごし方は、どうでしたか？',retail:'商品や、お買い物のしやすさは、どうでしたか？'};
// instruction-025 B: poster caption (printed) and voice script (screen only) per store kind. No discounts, rewards or requests for high ratings (tests/poster_kit.test.mjs checks the wording).
const posterMessages={general:'スマホのカメラでQRを読み取り、感想をひとこと。\nよかったことも、気になったことも。',food:'お料理や過ごした時間の感想を、ひとこと。\nよかったことも、気になったことも。スマホのカメラでQRを読み取ってください。',beauty:'仕上がりや施術中のことを、ひとこと。\nよかったことも、気になったことも。スマホのカメラでQRを読み取ってください。',retail:'商品やお買い物のしやすさを、ひとこと。\nよかったことも、気になったことも。スマホのカメラでQRを読み取ってください。'};
const voiceScripts={general:'「よろしければ、今日の感想をこちらのQRからひとことお聞かせください。よかったことも、気になったことも、どちらでも大丈夫です。」',food:'「お会計のときに失礼します。よろしければ、お料理やお店で過ごした時間の感想を、こちらのQRからひとことお聞かせください。気になった点もぜひ教えてください。」',beauty:'「お疲れさまでした。よろしければ、仕上がりや施術中のことを、こちらのQRからひとことお聞かせください。気になった点も参考にします。」',retail:'「ありがとうございました。よろしければ、商品やお買い物のしやすさについて、こちらのQRからひとことお聞かせください。気になった点も教えてください。」'};
// instruction-025 A: anonymous funnel step counts. Sends only the step name; never text, store name or review link. Failures are ignored.
// ③ The first time this page reaches a step it also sends `sec`: the time since the customer screen opened, as a bucket only
// (0-10/10-20/20-30/30-60/60-120/120+ seconds), and `sid` when the QR carries a random store ID (① the store's own report).
// Repeats of the older steps (draft/copy/google/direct) still send {event} alone, as before; the newer steps are sent once per page.
const TIME_BUCKETS=[[10,'0-10'],[20,'10-20'],[30,'20-30'],[60,'30-60'],[120,'60-120'],[Infinity,'120+']];
let openedAt=0;const reached=new Set();
const secBucket=()=>{const s=(performance.now()-openedAt)/1000;return TIME_BUCKETS.find(([hi])=>s<hi)[1];};
function track(event){const body={event};if(!reached.has(event)){reached.add(event);body.sec=secBucket();if(storeId)body.sid=storeId;}
  try{fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});}catch{}}
function reach(step){if(!reached.has(step))track(step);}
// ① Random store ID from a newer QR (s=, 22 characters). Old QRs have none and work exactly as before.
const storeId=(()=>{const v=qs.get('s')||'';return /^[A-Za-z0-9_-]{22}$/.test(v)?v:'';})();
// instruction-025 C: customer screen in ja/en/zh/ko. Only the interface is translated; the customer's own words are never translated.
const I18N={
ja:{htmlLang:'ja',suffix:n=>n+' への感想',h1:'どんな時間でしたか？',lead1:'タップで選ぶだけで、文章の候補ができます。',lead2:'自分の言葉で書くこともできます。',pickTitle:'それぞれ、どうでしたか？',pickNote:'すべての話題で、よかった・ふつう・気になった のどれかを選んでください。「どこが？」は選ばなくても大丈夫です。',unanswered:'未回答',fromText:e=>'書いた「'+e+'」から選びました',writeOwn:'選ばずに、自分で書く',rate_good:'よかった',rate_ok:'ふつう',rate_concern:'気になった',rateLegend:n=>n+'はどうでしたか？',detailQ_good:'よかったのはどこ？',detailQ_ok:'どこがふつう？',detailQ_concern:'気になったのはどこ？',detailNote:'選ばなくてもOK・いくつでも',addLabel:'思ったことを書く',addOptional:'なくてもOK',addPlaceholder:'例：料理はおいしかった。待ち時間が少し長かった',addNote:'書いた文章はAIが読み取って、下の表を先に選びます（違うところは直せます）。文章は句読点だけを整えて、候補の最後に付けます。名前・連絡先などの個人情報は書かないでください。200文字まで。',classifyBtn:'書いた内容から選ぶ',classifying:'読み取っています…',classifyDone:n=>n+'件の話題を先に選びました。確かめて、違うところは直してください。',classifyNone:'書いた内容から選べる話題はありませんでした。下の表から選んでください。',classifyOff:'いまは読み取りを使えないため、下の表から選んでください。書いた文章は候補の最後に付きます。',composeBtn:'文章の候補を見る',composeOff:'文章の候補を作る部分を読み込めませんでした。下の欄に、自分の言葉で書けます。',needTopic:'すべての話題に答えると押せます。',needAll:n=>'未回答があと'+n+'件あります。',composing:'ひとことを整えています…',candReady:'文章の候補ができました。まだ投稿されていません。',candH2:'近いものを1つ選んでください',candNote:'あなたが選んだことだけで組み立てた文章です。言い回しだけが違います。選んだあとで自由に直せます。',candLegend:'文章の候補',style_short:'短く',style_polite:'ていねい',style_casual:'くだけた',ownOption:'自分で書く',ownOptionNote:'候補を使わず、自分の言葉で書きます。',composedMode:'あなたが選んだことだけで組み立てた文章です。違うと感じたところは自由に直してください。',composedAi:'「ひとこと」はAIが句読点を整えて最後に付けました。',composedFallback:'「ひとこと」は入力したまま最後に付けました。',hintTitle:'何から書こう？と思ったら',hintNote:'よかった点も、気になった点も。答えずに自由に書いても大丈夫です。',expLabel:'あなたの感想',expPlaceholder:'例：窓際の席でゆっくりできました。コーヒーは少し熱かったです。',expNote:'名前・連絡先などの個人情報は書かないでください。文章を整えるとき、入力文をAIへ送ります。感想は580文字まで。',draftBtn:'文章を整えてみる',direct:'文章を整えず、Googleで書く',resultEyebrow:'仕上げは、あなたの言葉で。',resultH2:'この内容で伝わりますか？',editLabel:'自由に直せます',confirm:'自分の体験と合っていることを確認しました',copyBtn:'感想をコピー',googleBtn:'Googleを開く',googleNote:'Googleで貼り付けて、星と内容を確認してください。投稿はご自身の操作で行います。自動では投稿されません。',needInput:'短い感想を書いてください。',working:'文章を整えています…',done:'下書きができました。まだ投稿されていません。',aiMode:'AIが文章を整えました。違うと感じた表現は直してください。',fallbackMode:'いまはAI整文を利用できないため、入力した言葉をそのまま表示しています。自由に直してお使いください。',copied:'コピーしました。',copyFail:'自動コピーできませんでした。入力欄の文章を選択してコピーしてください。',addNoteRoute:'文章は句読点だけを整えて、候補の最後に付けます。名前・連絡先などの個人情報は書かないでください。200文字まで。',routeUnavailable:'いまは画面の一部を読み込めませんでした。時間をおいて、もう一度開いてください。',heldTitle:'ご回答ありがとうございました',heldNote:'選んでいただいた話題と評価は、お客さまが特定されない件数の形でお店に届きます。書いた文章は、お店にも運営にも保存されません。',snsTitle:'お店のアカウント',snsLine:'お店の LINE を友だち追加',snsInstagram:'インスタをフォロー',prompts:writingPrompts},
en:{htmlLang:'en',suffix:n=>'Your thoughts on '+n,h1:'How was your visit?',lead1:'Just tap to choose, and draft sentences appear.',lead2:'You can also write in your own words.',pickTitle:'How was each of these?',pickNote:'For every item, choose Good, Average or A concern. “Which part?” is optional.',unanswered:'Not answered',fromText:e=>'Chosen from “'+e+'”',writeOwn:'Skip this and write my own',rate_good:'Good',rate_ok:'Average',rate_concern:'A concern',rateLegend:n=>'How was the '+n+'?',detailQ_good:'Which part was good?',detailQ_ok:'Which part was average?',detailQ_concern:'Which part was a concern?',detailNote:'Optional, choose any',addLabel:'Write what you thought',addOptional:'optional',addPlaceholder:'e.g. The food was good. The wait was a bit long',addNote:'AI reads what you write and pre-selects the table below (you can change it). Your words get tidied punctuation only and go at the end of the drafts. Please do not include personal information such as names or contact details. Up to 200 characters.',classifyBtn:'Choose from what I wrote',classifying:'Reading…',classifyDone:n=>n+' item(s) pre-selected. Please check them and change anything that is wrong.',classifyNone:'Nothing in the text matched the items. Please choose below.',classifyOff:'Reading is not available right now, so please choose below. Your words will still go at the end of the drafts.',composeBtn:'See draft sentences',composeOff:'The draft builder could not be loaded. You can write in your own words below.',needTopic:'Answer every item to continue.',needAll:n=>n+' item(s) not answered yet.',composing:'Tidying your words…',candReady:'Draft sentences are ready. Nothing has been posted yet.',candH2:'Choose the one closest to you',candNote:'Each is built only from what you chose; only the wording differs. You can edit it afterwards.',candLegend:'Draft sentences',style_short:'Short',style_polite:'Polite',style_casual:'Casual',ownOption:'Write my own',ownOptionNote:'Skip the drafts and write in your own words.',composedMode:'This text is built only from what you chose. Change anything that does not fit.',composedAi:'AI tidied the punctuation of the words you added at the end.',composedFallback:'The words you added are at the end, as written.',hintTitle:'Not sure where to start?',hintNote:'Good points and concerns are both welcome. You can also write freely without answering.',expLabel:'Your comments',expPlaceholder:'e.g. The window seat was relaxing. The coffee was a bit too hot.',expNote:'Please do not include personal information such as names or contact details. When tidying the text, what you wrote is sent to an AI. Up to 580 characters.',draftBtn:'Tidy up my text',direct:'Write on Google without tidying',resultEyebrow:'Finish it in your own words.',resultH2:'Does this say what you mean?',editLabel:'You can edit freely',confirm:'I confirm this matches my own experience',copyBtn:'Copy my comments',googleBtn:'Open Google',googleNote:'Paste it on Google and check the stars and text. You post it yourself; nothing is posted automatically.',needInput:'Please write a short comment.',working:'Tidying your text…',done:'Your draft is ready. Nothing has been posted yet.',aiMode:'AI tidied the text. Please change anything that does not sound like you.',fallbackMode:'AI tidying is not available right now, so your words are shown as written. Edit them freely.',copied:'Copied.',copyFail:'Could not copy automatically. Please select the text in the box and copy it.',addNoteRoute:'Your words get tidied punctuation only and go at the end of the drafts. Please do not include personal information such as names or contact details. Up to 200 characters.',routeUnavailable:'Part of this page could not be loaded. Please open it again later.',heldTitle:'Thank you for your answers',heldNote:'The items and ratings you chose reach the shop only as counts that do not identify you. Anything you wrote is not saved by the shop or by us.',snsTitle:'The shop\'s accounts',snsLine:'Add the shop on LINE',snsInstagram:'Follow on Instagram',prompts:{general:'What stood out to you today?',food:'What stood out about the food, drinks or your time here?',beauty:'How were the result and your time during the treatment?',retail:'How were the products and the shopping experience?'}},
zh:{htmlLang:'zh-Hans',suffix:n=>'对 '+n+' 的感想',h1:'这次体验怎么样？',lead1:'只需点选，就能生成文字候选。',lead2:'也可以用自己的话书写。',pickTitle:'以下各项怎么样？',pickNote:'请为每一项选择“好”“一般”或“有在意的地方”。“哪里？”可以不选。',unanswered:'未回答',fromText:e=>'根据您写的“'+e+'”选择',writeOwn:'不选择，自己写',rate_good:'好',rate_ok:'一般',rate_concern:'有在意的地方',rateLegend:n=>n+'怎么样？',detailQ_good:'哪里好？',detailQ_ok:'哪里一般？',detailQ_concern:'哪里让您在意？',detailNote:'可不选，可多选',addLabel:'写下您的想法',addOptional:'可不填',addPlaceholder:'例：菜很好吃。等待时间有点长',addNote:'AI会读取您写的内容，先帮您选好下面的表（可以修改）。您写的文字只整理标点，放在候选文字的最后。请不要填写姓名、联系方式等个人信息。最多200字。',classifyBtn:'根据所写内容选择',classifying:'正在读取…',classifyDone:n=>'已先选好'+n+'项。请确认，不对的地方请修改。',classifyNone:'没有从您写的内容中找到对应的项目。请在下面选择。',classifyOff:'目前无法读取，请在下面选择。您写的文字仍会放在候选文字的最后。',composeBtn:'查看文字候选',composeOff:'无法加载生成文字候选的部分。可以在下面用自己的话书写。',needTopic:'回答所有项目后即可点击。',needAll:n=>'还有'+n+'项未回答。',composing:'正在整理您补充的内容…',candReady:'文字候选已生成，尚未发布。',candH2:'请选择最接近的一项',candNote:'这些文字只由您的选择组成，只有措辞不同。选择后可以自由修改。',candLegend:'文字候选',style_short:'简短',style_polite:'礼貌',style_casual:'随意',ownOption:'自己写',ownOptionNote:'不使用候选，用自己的话书写。',composedMode:'这段文字只由您的选择组成。如有不符合的地方，请自由修改。',composedAi:'您补充的内容由AI整理标点后放在最后。',composedFallback:'您补充的内容按原文放在最后。',hintTitle:'不知道从哪里写起？',hintNote:'好的地方和在意的地方都可以写。也可以不回答问题，自由书写。',expLabel:'您的感想',expPlaceholder:'例：靠窗的座位很放松。咖啡有点烫。',expNote:'请不要填写姓名、联系方式等个人信息。整理文字时，您输入的内容会发送给AI。最多580字。',draftBtn:'整理文字',direct:'不整理，直接在Google上写',resultEyebrow:'最后用您自己的话完成。',resultH2:'这样能表达您的意思吗？',editLabel:'可以自由修改',confirm:'我已确认内容与自己的体验相符',copyBtn:'复制感想',googleBtn:'打开Google',googleNote:'请在Google上粘贴，并确认星级和内容。发布需由您本人操作，不会自动发布。',needInput:'请写一句简短的感想。',working:'正在整理文字…',done:'草稿已完成，尚未发布。',aiMode:'AI已整理文字。如有不符合您本意的表达，请修改。',fallbackMode:'目前无法使用AI整理，显示的是您输入的原文。请自由修改后使用。',copied:'已复制。',copyFail:'无法自动复制。请选中输入框中的文字后复制。',addNoteRoute:'您写的文字只整理标点，放在候选文字的最后。请不要填写姓名、联系方式等个人信息。最多200字。',routeUnavailable:'目前无法加载页面的一部分。请稍后重新打开。',heldTitle:'感谢您的回答',heldNote:'您选择的项目和评价，会以无法识别您个人的件数形式转达给店铺。您写的文字，店铺和运营方都不会保存。',snsTitle:'店铺账号',snsLine:'添加店铺的 LINE 好友',snsInstagram:'关注 Instagram',prompts:{general:'今天的体验中，哪些让您印象深刻？',food:'菜品、饮品或在店里度过的时间，哪些让您印象深刻？',beauty:'效果和服务过程中的感受如何？',retail:'商品和购物的便利程度如何？'}},
ko:{htmlLang:'ko',suffix:n=>n+' 에 대한 소감',h1:'어떤 시간이었나요?',lead1:'탭해서 고르기만 하면 문장 후보가 만들어져요.',lead2:'직접 쓸 수도 있어요.',pickTitle:'각각 어땠나요?',pickNote:'모든 항목에서 좋았어요·보통·신경 쓰였어요 중 하나를 골라 주세요. 「어디가?」는 안 골라도 돼요.',unanswered:'미응답',fromText:e=>'쓰신 「'+e+'」에서 골랐어요',writeOwn:'고르지 않고 직접 쓰기',rate_good:'좋았어요',rate_ok:'보통',rate_concern:'신경 쓰였어요',rateLegend:n=>n+' 부분은 어땠나요?',detailQ_good:'어디가 좋았나요?',detailQ_ok:'어디가 보통이었나요?',detailQ_concern:'어디가 신경 쓰였나요?',detailNote:'안 골라도 돼요 · 여러 개 가능',addLabel:'생각한 것을 쓰기',addOptional:'없어도 돼요',addPlaceholder:'예: 요리가 맛있었어요. 기다리는 시간이 조금 길었어요',addNote:'쓴 내용을 AI가 읽고 아래 표를 먼저 골라 둬요(고칠 수 있어요). 쓴 문장은 문장부호만 다듬어 후보 끝에 붙여요. 이름, 연락처 등 개인정보는 쓰지 마세요. 200자까지.',classifyBtn:'쓴 내용으로 고르기',classifying:'읽는 중…',classifyDone:n=>n+'개 항목을 먼저 골랐어요. 확인하고 다른 부분은 고쳐 주세요.',classifyNone:'쓴 내용에서 고를 수 있는 항목이 없었어요. 아래에서 골라 주세요.',classifyOff:'지금은 읽기를 쓸 수 없어요. 아래에서 골라 주세요. 쓴 문장은 후보 끝에 붙어요.',composeBtn:'문장 후보 보기',composeOff:'문장 후보를 만드는 부분을 불러오지 못했어요. 아래에 직접 쓸 수 있어요.',needTopic:'모든 항목에 답하면 누를 수 있어요.',needAll:n=>'아직 '+n+'개 항목이 미응답이에요.',composing:'한마디를 다듬고 있어요…',candReady:'문장 후보가 준비되었습니다. 아직 게시되지 않았습니다.',candH2:'가장 가까운 것을 하나 고르세요',candNote:'고르신 것만으로 만든 문장이며, 표현만 달라요. 고른 뒤 자유롭게 고칠 수 있어요.',candLegend:'문장 후보',style_short:'짧게',style_polite:'정중하게',style_casual:'편하게',ownOption:'직접 쓰기',ownOptionNote:'후보를 쓰지 않고 나의 말로 씁니다.',composedMode:'고르신 것만으로 만든 문장입니다. 다르게 느껴지는 부분은 자유롭게 고쳐 주세요.',composedAi:'더한 한마디는 AI가 문장부호를 다듬어 끝에 붙였습니다.',composedFallback:'더한 한마디는 입력한 그대로 끝에 붙였습니다.',hintTitle:'무엇부터 쓸지 모르겠다면',hintNote:'좋았던 점도, 신경 쓰였던 점도 괜찮아요. 질문에 답하지 않고 자유롭게 써도 돼요.',expLabel:'나의 소감',expPlaceholder:'예: 창가 자리에서 편하게 쉴 수 있었어요. 커피는 조금 뜨거웠어요.',expNote:'이름, 연락처 등 개인정보는 쓰지 마세요. 문장을 다듬을 때 입력한 내용이 AI로 전송됩니다. 580자까지.',draftBtn:'문장 다듬기',direct:'다듬지 않고 Google에서 쓰기',resultEyebrow:'마무리는 나의 말로.',resultH2:'이 내용으로 전달될까요?',editLabel:'자유롭게 고칠 수 있어요',confirm:'내 경험과 맞는지 확인했습니다',copyBtn:'소감 복사',googleBtn:'Google 열기',googleNote:'Google에 붙여 넣고 별점과 내용을 확인하세요. 게시는 직접 하시며, 자동으로 게시되지 않습니다.',needInput:'짧은 소감을 써 주세요.',working:'문장을 다듬고 있어요…',done:'초안이 준비되었습니다. 아직 게시되지 않았습니다.',aiMode:'AI가 문장을 다듬었습니다. 다르게 느껴지는 표현은 고쳐 주세요.',fallbackMode:'지금은 AI 다듬기를 사용할 수 없어 입력한 말을 그대로 보여 드립니다. 자유롭게 고쳐서 사용하세요.',copied:'복사했습니다.',copyFail:'자동으로 복사하지 못했습니다. 입력란의 문장을 선택해서 복사해 주세요.',addNoteRoute:'쓴 문장은 문장부호만 다듬어 후보 끝에 붙여요. 이름, 연락처 등 개인정보는 쓰지 마세요. 200자까지.',routeUnavailable:'지금은 화면의 일부를 불러오지 못했어요. 잠시 후 다시 열어 주세요.',heldTitle:'답변해 주셔서 감사합니다',heldNote:'고르신 항목과 평가는 손님을 알 수 없는 건수 형태로 가게에 전달됩니다. 쓰신 문장은 가게에도 운영자에게도 저장되지 않습니다.',snsTitle:'가게 계정',snsLine:'가게 LINE 친구 추가',snsInstagram:'인스타그램 팔로우',prompts:{general:'오늘 경험 중 기억에 남는 것은?',food:'요리, 음료, 머문 시간 중 기억에 남는 것은?',beauty:'결과와 시술 중의 시간은 어떠셨나요?',retail:'상품과 쇼핑의 편리함은 어떠셨나요?'}}};
function pickLang(){const q=(qs.get('lang')||'').toLowerCase();if(Object.hasOwn(I18N,q))return q;for(const l of (navigator.languages||[navigator.language||''])){const p=String(l).toLowerCase().split('-')[0];if(Object.hasOwn(I18N,p))return p;}return 'ja';}
let lang='ja';const t=k=>I18N[lang][k];
function applyLang(next){lang=Object.hasOwn(I18N,next)?next:'ja';const d=I18N[lang];document.documentElement.lang=d.htmlLang;document.querySelectorAll('#customer-view [data-i18n]').forEach(el=>{el.textContent=d[el.dataset.i18n];});$('experience').placeholder=d.expPlaceholder;$('addition').placeholder=d.addPlaceholder;if(Compose)renderPick();else announce('compose-status',d.composeOff);if(!$('candidates').classList.contains('hidden'))renderCandidates();$('writing-prompt').textContent=d.prompts[qs.get('kind')]||d.prompts.general;if(storeName)$('customer-store').textContent=d.suffix(storeName);document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>applyLang(b.dataset.lang)));
function validGoogle(raw){try{const u=new URL(raw);const h=u.hostname.toLowerCase();if(u.protocol!=='https:'||u.username||u.password||u.port)return null;let ok=false;if(h==='maps.app.goo.gl')ok=/^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);else if(h==='g.page')ok=/^\/(?:r\/)?[A-Za-z0-9_-]+\/review\/?$/.test(u.pathname);else if(h==='search.google.com')ok=u.pathname==='/local/writereview'&&/^[A-Za-z0-9_-]+$/.test(u.searchParams.get('placeid')||'');else if(['www.google.com','google.com','www.google.co.jp','maps.google.com'].includes(h))ok=/^\/maps(?:\/|$)/.test(u.pathname);return ok?u.href:null;}catch{return null}}
function announce(el,text){$(el).textContent=text;}
async function copy(text,el,msg={copied:'コピーしました。',copyFail:'自動コピーできませんでした。入力欄の文章を選択してコピーしてください。'}){try{await navigator.clipboard.writeText(text);announce(el,msg.copied);}catch{announce(el,msg.copyFail)}}
// Pick-to-draft (compose.js): the customer picks topics (fixed neutral nouns per store kind) and how each one was;
// candidates are built from those picks only. Ratings start unselected and look the same, so no answer is favoured.
const Compose=window.HitokotoCompose;const kind=qs.get('kind')||'general';
// topic id -> {rating:'good'|'ok'|'concern', details:[detail ids], by:'me'|'ai', quote} (compose.js orders the text itself).
// Details ("どこが？") are optional and have no rating of their own: they take the topic's rating.
const picks=new Map();
let tidied={text:'',mode:''};let candidateTexts=[];
const smooth=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
// /api/draft: punctuation-only tidying; on any failure the customer's own words are used as written.
async function tidy(text){try{const res=await fetch('/api/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,storeName}),signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('unavailable');const data=await res.json();if(typeof data.draft!=='string'||!['ai','fallback'].includes(data.mode))throw Error('invalid');return {draft:data.draft.slice(0,1600),mode:data.mode};}catch{return {draft:text,mode:'fallback'};}}
function showResult(text,note){$('draft-text').value=text;$('confirm').checked=false;setConfirmed();$('draft-mode').textContent=note;$('draft-result').classList.remove('hidden');}
function el(tag,props,kids){const e=document.createElement(tag);Object.assign(e,props||{});for(const k of kids||[])e.append(k);return e;}
// Every topic of the kind is listed from the start and each needs one of the three ratings (本人決定 2026-09-29: 江藤さん案、「なし」は置かない).
// Ratings start unselected and look the same. "どこが？" details stay optional and open under an answered row; changing the rating keeps them.
// The one free-text box (#addition) can pre-select rows through /api/classify (AI, checked by the worker); rows the customer set by hand are
// never overwritten, and every pre-selected row says which words it came from, so the customer can check and change it.
function renderPick(){
  $('topics').replaceChildren(...Compose.topicsFor(kind).map(id=>{
    const name=Compose.label(lang,kind,id);
    const row=el('div',{className:'rate-row'});row.dataset.topic=id;
    const seg=el('div',{className:'seg'});seg.setAttribute('role','radiogroup');seg.setAttribute('aria-label',I18N[lang].rateLegend(name));seg.setAttribute('aria-required','true');
    const state=el('span',{className:'rate-state'});const from=el('p',{className:'rate-from hint'});
    const q=el('p',{className:'detail-q'});q.id='detail-q-'+id;
    const chips=el('div',{className:'chips detail-chips'});chips.setAttribute('role','group');chips.setAttribute('aria-labelledby',q.id);
    const detail=el('div',{className:'detail-part'},[q,chips]);
    chips.append(...Compose.detailsFor(kind,id).map(d=>{const b=el('button',{type:'button',textContent:Compose.detailLabel(lang,d)});b.dataset.detail=d;b.setAttribute('aria-pressed',String((picks.get(id)||{details:[]}).details.includes(d)));
      b.addEventListener('click',()=>{const p=picks.get(id);if(!p)return;const on=!p.details.includes(d);p.details=on?[...p.details,d]:p.details.filter(x=>x!==d);b.setAttribute('aria-pressed',String(on));});return b;}));
    for(const r of Compose.RATINGS){const input=el('input',{type:'radio',name:'rate-'+id,value:r,checked:(picks.get(id)||{}).rating===r});
      input.addEventListener('change',()=>{const p=picks.get(id);if(p){p.rating=r;p.by='me';p.quote='';}else picks.set(id,{rating:r,details:[],by:'me',quote:''});syncRow(row);syncCompose();announce('compose-status','');reach('rating');});
      seg.append(el('label',{},[input,el('span',{textContent:t('rate_'+r)})]));}
    row.append(el('div',{className:'rate-head'},[el('span',{className:'rate-name'},[el('span',{textContent:name}),state]),seg]),from,detail);syncRow(row);return row;}));
  syncCompose();
}
function syncRow(row){const id=row.dataset.topic,p=picks.get(id);
  row.classList.toggle('is-answered',Boolean(p));row.querySelector('.rate-state').textContent=p?'':t('unanswered');
  row.querySelectorAll('.seg input').forEach(i=>{i.checked=Boolean(p)&&i.value===p.rating;});
  row.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-pressed',String(Boolean(p)&&p.details.includes(b.dataset.detail))));
  const from=row.querySelector('.rate-from');from.textContent=p&&p.by==='ai'&&p.quote?t('fromText')(p.quote):'';from.classList.toggle('hidden',!from.textContent);
  const detail=row.querySelector('.detail-part'),q=row.querySelector('.detail-q');detail.classList.toggle('hidden',!p);
  if(p)q.replaceChildren(t('detailQ_'+p.rating),' ',el('span',{className:'optional',textContent:t('detailNote')}));}
// "文章の候補を見る" can be pressed once every topic has an answer; the remaining count is said in words, not only by colour.
function missingTopics(){return Compose.topicsFor(kind).filter(id=>!picks.has(id));}
function syncCompose(){const left=missingTopics().length;$('compose-button').disabled=left>0;$('compose-need').textContent=left?t('needAll')(left)+t('needTopic'):'';$('compose-need').classList.toggle('hidden',!left);if(!left)reach('rated');}
// /api/classify: AI reads the free text and suggests topic × rating × details. Only rows not set by hand are filled. Without AI nothing changes.
async function classifyText(){await configReady;if(storeConfig.route)return;  // Devin r2b B1 / 審査 1: never read the text with AI while routing is on
  const text=$('addition').value.trim();if(!text){announce('classify-status',t('needInput'));return;}
  $('classify-button').disabled=true;announce('classify-status',t('classifying'));let data=null;
  try{const res=await fetch('/api/classify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:Object.hasOwn(Compose.TOPICS,kind)?kind:'general',text}),signal:AbortSignal.timeout(15000)});if(res.ok)data=await res.json();}catch{data=null;}
  finally{$('classify-button').disabled=false;}
  if(!data||data.mode!=='ai'||!Array.isArray(data.picks)){announce('classify-status',t('classifyOff'));return;}
  const allowed=Compose.topicsFor(kind);let n=0;
  for(const p of data.picks){if(!p||!allowed.includes(p.topic)||!Compose.RATINGS.includes(p.rating))continue;const cur=picks.get(p.topic);if(cur&&cur.by==='me')continue;
    const ok=Compose.detailsFor(kind,p.topic);picks.set(p.topic,{rating:p.rating,details:Array.isArray(p.details)?ok.filter(d=>p.details.includes(d)):[],by:'ai',quote:typeof p.quote==='string'?p.quote.slice(0,40):''});n++;}
  document.querySelectorAll('#topics .rate-row').forEach(syncRow);syncCompose();
  announce('classify-status',n?t('classifyDone')(n):t('classifyNone'));if(n)reach('classify');
  const first=missingTopics()[0];const target=first&&$('topics').querySelector('[data-topic="'+first+'"] input');if(target)target.focus();}
function renderCandidates(){
  const list=[...picks].map(([topic,p])=>({topic,rating:p.rating,details:p.details}));let out;try{out=Compose.compose(lang,kind,list,tidied.text);}catch{return false;}
  candidateTexts=out.map(c=>c.text);
  $('cand-options').replaceChildren(...out.map((c,i)=>{const input=el('input',{type:'radio',name:'cand',value:String(i)});
    return el('label',{className:'cand'},[input,el('span',{className:'cand-body'},[el('span',{className:'cand-style',textContent:t('style_'+c.style)}),el('span',{className:'cand-text',textContent:c.text})])]);}));
  document.querySelectorAll('input[name=cand]').forEach(r=>{r.checked=false;});return true;
}
// Pick counts (DECISIONS.md「選択の記録」): the first time candidates are shown in a session, send only the store kind and the picked
// topic × rating × details ids. Never the text, the added words, the store name or the share link. Failures are ignored.
let pickStatSent=false;
function sendPickStat(){
  if(pickStatSent)return;pickStatSent=true;
  // once per tab session *per store*: the key carries the sid, so trying several stores' QRs on one phone counts each store; old QRs share one key
  const key='hk-pick-stat'+(storeId?':'+storeId:'');
  try{const s=window.sessionStorage;if(s.getItem(key))return;s.setItem(key,'1');}catch{/* storage blocked: once per page */}
  const body={kind:Object.hasOwn(Compose.TOPICS,kind)?kind:'general',picks:[...picks].map(([topic,p])=>({topic,rating:p.rating,details:[...p.details]}))};
  if(storeId)body.sid=storeId;
  try{fetch('/api/pick-stat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});}catch{/* never blocks the customer */}
}
function openWriteOwn(focus){$('write-own').classList.remove('hidden');$('write-own-toggle').setAttribute('aria-expanded','true');$('draft-result').classList.add('hidden');if(focus){$('write-own').scrollIntoView({behavior:smooth(),block:'start'});$('experience').focus({preventScroll:true});}}
$('write-own-toggle').addEventListener('click',()=>openWriteOwn(true));$('classify-button').addEventListener('click',classifyText);
// Devin r2b-4: one press at a time (the button is disabled before waiting for the setting, so a second press cannot start another AI call)
let composeBusy=false;
$('compose-button').addEventListener('click',async()=>{
  if(missingTopics().length||composeBusy)return;
  composeBusy=true;$('compose-button').disabled=true;
  try{
  await configReady;
  const add=$('addition').value.trim();track('draft');
  if(storeConfig.route&&Compose.isLow(kind,[...picks].map(([topic,p])=>({topic,rating:p.rating,details:p.details})))){showHeld();return;}
  routePassed=storeConfig.route;
  if($('held-result'))$('held-result').classList.add('hidden');
  if(add){announce('compose-status',t('composing'));const r=await tidy(add);tidied={text:r.draft,mode:r.mode};}else tidied={text:'',mode:''};
  if(!renderCandidates())return;
  sendPickStat();reach('cands');
  $('draft-result').classList.add('hidden');$('candidates').classList.remove('hidden');announce('compose-status',t('candReady'));
  $('candidates').scrollIntoView({behavior:smooth(),block:'start'});$('cand-title').focus({preventScroll:true});
  }finally{composeBusy=false;syncCompose();}
});
// Choosing a candidate fills the edit box right below (no scrolling, so arrow keys can move through the choices).
$('candidates').addEventListener('change',e=>{if(e.target.name!=='cand')return;
  if(e.target.value==='own'){openWriteOwn(false);return;}
  $('write-own').classList.add('hidden');$('write-own-toggle').setAttribute('aria-expanded','false');reach('cand');
  const note=t('composedMode')+(tidied.text?(lang==='ja'||lang==='zh'?'':' ')+t(tidied.mode==='ai'?'composedAi':'composedFallback'):'');
  showResult(candidateTexts[Number(e.target.value)]||'',note);});
// compose.js did not load (blocked, 404, network): the pick table cannot be built, so say why and open "write my own" instead of
// leaving a button that never enables. Only the status line of the pick card stays.
function composeUnavailable(){$('pick-card').querySelectorAll(':scope > :not(#compose-status)').forEach(e=>e.classList.add('hidden'));openWriteOwn(false);}
function showCustomer(name,url){storeName=name;reviewUrl=url;openedAt=performance.now();document.body.dataset.view='customer';$('store-view').classList.add('hidden');$('customer-view').classList.remove('hidden');if(!Compose)composeUnavailable();document.querySelectorAll('.direct-google').forEach(a=>a.href=url);$('google-link').href=url;applyLang(pickLang());track('view');if(storeId){const last=readStoredConfig();if(last){storeConfig=last;applyStoreConfig();}setConfigPending(true);configReady=loadStoreConfig().finally(()=>setConfigPending(false));}}
// 管理画面の「お店の設定」（2026-10-02 本人決定。新しいQR・s= のときだけ）: GET /api/store-config で、振り分け（route）と LINE・インスタのURLを読む。
// 送るのは店ID だけ。振り分けがオフで URL も無い店では、この画面の DOM も送る内容も、この機能が入る前（main e4e1ebb）と同じ（dashboard_browser.py で照合）。
// 本人決定 C: 読めた設定はこの端末の localStorage に店IDごとに残し（運営には送らない）、次に読めないとき（通信・サーバー・3秒）はそれを使う。
// オンを一度読んだ端末では、読めないあいだも振り分ける側。一度も読めていない端末だけオフ側（同意していない店では振り分けが起きないように）。
// compose.js が無いときにオンなら、評価を判定できないので Google への案内も AI の道も出さず、理由だけを出す。
// Devin r2b B1: until the setting is known (s= screens only), the paths that send text to the AI or lead to Google are held:
// their buttons are disabled while loading, and every handler checks the setting again after configReady (routePassed = this customer
// was judged "not low" while routing is on). Devin r2b B2: a stored setting is used only for the current consent version and for 7 days.
const CONSENT_VERSION='2026-10-02b';const CONFIG_TTL_MS=7*86400000;
let storeConfig={route:false,line:'',instagram:''};let configReady=Promise.resolve();let configPending=false;let routePassed=false;
function setConfigPending(on){configPending=on;['write-own-toggle','classify-button','draft-button'].forEach(id=>{$(id).disabled=on;});}
const routeBlocks=()=>configPending||(storeConfig.route&&!routePassed);
const LINK_OK={line:/^https:\/\/(?:lin\.ee\/[A-Za-z0-9_-]{1,40}|line\.me\/R\/ti\/p\/@[A-Za-z0-9._-]{1,40})$/,instagram:/^https:\/\/www\.instagram\.com\/[A-Za-z0-9._]{1,30}\/$/};
const CONFIG_KEY=()=>'hk-store-config:'+storeId;
// "on" counts only with the consent version this page was written for (an older consent is off, like on the server).
function cleanConfig(d){return d&&typeof d==='object'?{route:d.route===true&&d.consent===CONSENT_VERSION,line:typeof d.line==='string'&&LINK_OK.line.test(d.line)?d.line:'',instagram:typeof d.instagram==='string'&&LINK_OK.instagram.test(d.instagram)?d.instagram:''}:null;}
// a stored setting without a time, from the future, older than 7 days or for another consent version is not used (routing off when unknown)
function readStoredConfig(){try{const o=JSON.parse(window.localStorage.getItem(CONFIG_KEY())||'null');const age=o&&typeof o.savedAt==='number'?Date.now()-o.savedAt:NaN;
  return age>=-60000&&age<=CONFIG_TTL_MS?cleanConfig(o):null;}catch{return null;}}
async function loadStoreConfig(){try{const res=await fetch('/api/store-config?s='+encodeURIComponent(storeId),{signal:AbortSignal.timeout(3000)});if(!res.ok)return;const d=cleanConfig(await res.json());if(!d)return;
  storeConfig=d;try{window.localStorage.setItem(CONFIG_KEY(),JSON.stringify({...d,consent:d.route?CONSENT_VERSION:'',savedAt:Date.now()}));}catch{/* storage blocked */}applyStoreConfig();}catch{/* keep the last known setting, or off */}}
// 振り分けオン: Google への案内は、全部の話題に答えて「評価が低い」（Compose.isLow）でないと分かったあとにだけ出す。答える前に Google へ進む
// 2つの道（「選ばずに、自分で書く」と「文章を整えず、Googleで書く」）と、評価が分かる前に本文を AI に送る「書いた内容から選ぶ」（審査 1）は隠す。
// LINE・インスタのボタンは評価と関係なく、全員に同じものを最初から出す。オフに戻ったら（新しく読んだ設定がオフ）、隠したものだけを戻す。
let routeHidden=[];
function applyStoreConfig(){
  if(storeConfig.route&&!routeHidden.length){
    routeHidden=[$('write-own-toggle'),$('classify-button'),$('classify-status'),...document.querySelectorAll('.direct-google')].filter(e=>!e.classList.contains('hidden'));routeHidden.forEach(e=>e.classList.add('hidden'));
    const note=$('addition-part').querySelector('[data-i18n="addNote"]');if(note){note.dataset.i18n='addNoteRoute';note.textContent=t('addNoteRoute');}
    if(!Compose)announce('compose-status',t('routeUnavailable'));}
  // Devin r2b B1: anything opened before "on" was known (write-own, a draft with its Google button) is closed; a customer judged "not low"
  // keeps the screen they reached
  if(storeConfig.route&&!routePassed){$('write-own').classList.add('hidden');$('write-own-toggle').setAttribute('aria-expanded','false');$('draft-result').classList.add('hidden');}
  else if(!storeConfig.route&&routeHidden.length){routeHidden.forEach(e=>e.classList.remove('hidden'));routeHidden=[];
    const note=$('addition-part').querySelector('[data-i18n="addNoteRoute"]');if(note){note.dataset.i18n='addNote';note.textContent=t('addNote');}
    if(!Compose)composeUnavailable();}
  renderStoreLinks();
}
function i18nEl(tag,key,props){const e=el(tag,{...props,textContent:t(key)});e.dataset.i18n=key;return e;}
// Devin r2b-3: rebuilt on every setting applied, so a removed link disappears and a new one appears.
function renderStoreLinks(){if($('store-links'))$('store-links').remove();if(!storeConfig.line&&!storeConfig.instagram)return;
  const links=[['line','snsLine'],['instagram','snsInstagram']].filter(([k])=>storeConfig[k]).map(([k,key])=>{const a=el('a',{className:'secondary store-link',href:storeConfig[k],target:'_blank',rel:'noopener noreferrer'},[i18nEl('span',key),' ↗']);a.id='store-link-'+k;return a;});
  const box=el('section',{className:'card store-links'},[i18nEl('h2','snsTitle',{id:'store-links-title'}),el('div',{className:'store-link-row'},links)]);box.id='store-links';box.setAttribute('aria-labelledby','store-links-title');
  $('customer-view').insertBefore(box,$('customer-fb'));}
// 振り分けオンで「評価が低い」: Google への案内（候補・コピー・Googleを開く）を出さず、お礼だけを出す。件数（held/passed）は sendPickStat の
// 「1つの画面・1店で1回」に従い、最初に「文章の候補を見る」を押したときの判定で決まる（答え直しても数え直さない。意図どおり・審査 8）。選んだ話題と評価は /api/pick-stat で
// いつもと同じ形で送り、worker が同じ判定で「お店にだけ届いた声」として数える。書いた文章は AI にも送らない（保存もしない）。
function showHeld(){sendPickStat();routePassed=false;
  let box=$('held-result');if(!box){box=el('section',{className:'card held-result'},[i18nEl('h2','heldTitle',{id:'held-title',tabIndex:-1}),i18nEl('p','heldNote')]);box.id='held-result';box.setAttribute('aria-labelledby','held-title');$('customer-view').insertBefore(box,$('store-links')||$('customer-fb'));}
  box.classList.remove('hidden');$('candidates').classList.add('hidden');$('draft-result').classList.add('hidden');$('write-own').classList.add('hidden');announce('compose-status','');
  box.scrollIntoView({behavior:smooth(),block:'start'});$('held-title').focus({preventScroll:true});}
if(qs.has('store')&&qs.has('review')){const name=qs.get('store').trim().slice(0,80),url=validGoogle(qs.get('review'));if(name&&url)showCustomer(name,url);else{history.replaceState(null,'',location.pathname+location.search+'#create');announce('store-error','共有リンクを確認してください。お店から受け取ったリンクをもう一度開いてください。');}}
// ① #create asks the worker for a random store ID and the owner's report token (POST /api/store, kind only: the store name and the
// Google link are never sent). The ID goes into the share link as s=; the token only into the owner's report link (URL fragment),
// shown on screen and on the owner's print, never on the poster. If that fails, the QR is made exactly as before, without either.
async function issueStore(kind){try{const res=await fetch('/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind}),signal:AbortSignal.timeout(8000)});if(!res.ok)return null;const d=await res.json();return /^[A-Za-z0-9_-]{22}$/.test(d.sid)&&/^[A-Za-z0-9_-]{43}$/.test(d.token)?d:null;}catch{return null;}}
// The report link: /report#t=<token>&g=<the Google review link the owner entered>. Both stay in the fragment (never sent to the server);
// g only lets the report page link to the store's Google page (効果の欄 D).
function showOwnerCopy(issued,name,href,review){
  $('owner-copy').classList.toggle('hidden',!issued);$('owner-copy-none').classList.toggle('hidden',Boolean(issued));
  const report=issued?location.origin+'/report#'+new URLSearchParams({t:issued.token,g:review}).toString():'';
  $('report-url').value=report;$('open-report').href=report||'#';$('owner-print-store').textContent=issued?name:'';$('owner-print-report').textContent=report;$('owner-print-share').textContent=issued?href:'';
}
$('store-form').addEventListener('submit',async e=>{e.preventDefault();const name=$('store-name').value.trim(),url=validGoogle($('review-url').value.trim());if(!name||!url){announce('store-error','お店の名前と、httpsから始まるGoogleの口コミリンクを入力してください。');return;}announce('store-error','');
  const kind=$('store-kind').value;const btn=$('store-form').querySelector('button[type=submit]');btn.disabled=true;let issued;try{issued=await issueStore(Object.hasOwn(writingPrompts,kind)?kind:'general');}finally{btn.disabled=false;}
  const u=new URL(location.origin+location.pathname);u.searchParams.set('store',name);u.searchParams.set('review',url);if(Object.hasOwn(writingPrompts,kind)&&kind!=='general')u.searchParams.set('kind',kind);if(issued)u.searchParams.set('s',issued.sid);
  showOwnerCopy(issued,name,u.href,url);
  $('share-url').value=u.href;$('preview-link').href=u.href;$('share-result').classList.remove('hidden');if(typeof qrcode==='function'){try{const qr=qrcode(0,'M');qr.addData(u.href);qr.make();$('qr-area').innerHTML=qr.createSvgTag({cellSize:4,margin:4,scalable:true});$('qr-area').classList.remove('hidden');$('qr-area').querySelector('svg').setAttribute('aria-label','お客さま向け共有リンクのQRコード');preparePoster(name,u.href,kind);}catch{$('qr-area').textContent='QRにするにはリンクが長すぎます。共有リンクをお使いください。';$('qr-area').classList.remove('hidden');$('poster-actions').classList.add('hidden');$('print-store').textContent='';$('print-url').textContent='';$('print-message').textContent='';$('voice-script').textContent='';$('download-qr').removeAttribute('href');if(posterUrl){URL.revokeObjectURL(posterUrl);posterUrl='';}}}$('share-result').scrollIntoView({behavior:'smooth'});});
$('copy-link').addEventListener('click',()=>copy($('share-url').value,'store-error'));
let posterUrl='';function preparePoster(name,href,kind){const k=Object.hasOwn(posterMessages,kind)?kind:'general';$('print-store').textContent=name;$('print-message').textContent=posterMessages[k];$('voice-script').textContent=voiceScripts[k];$('print-url').textContent=href;const svg=$('qr-area').querySelector('svg').cloneNode(true);svg.setAttribute('width','512');svg.setAttribute('height','512');if(posterUrl)URL.revokeObjectURL(posterUrl);posterUrl=URL.createObjectURL(new Blob([svg.outerHTML],{type:'image/svg+xml'}));$('download-qr').href=posterUrl;$('poster-actions').classList.remove('hidden');}
// Two prints from one page: the poster (default) and the owner's copy with the report link. body[data-print] picks which one the print CSS shows;
// the poster print never shows the owner's copy.
function printAs(what){document.body.dataset.print=what;window.print();}
window.addEventListener('afterprint',()=>{delete document.body.dataset.print;});
$('print-qr').addEventListener('click',()=>printAs('poster'));$('print-owner').addEventListener('click',()=>printAs('owner'));
$('copy-report').addEventListener('click',()=>copy($('report-url').value,'owner-copy-status'));
$('draft-form').addEventListener('submit',async e=>{e.preventDefault();await configReady;if(routeBlocks())return;const text=$('experience').value.trim();if(!text){announce('draft-status',t('needInput'));return;}track('draft');$('draft-button').disabled=true;announce('draft-status',t('working'));let draft,mode;try{({draft,mode}=await tidy(text));}finally{$('draft-button').disabled=false;} showResult(draft,t(mode==='ai'?'aiMode':'fallbackMode'));announce('draft-status',t('done'));$('draft-result').scrollIntoView({behavior:smooth()});});
function setConfirmed(){const ok=$('confirm').checked&&Boolean($('draft-text').value.trim());$('copy-draft').disabled=!ok;$('google-link').classList.toggle('disabled',!ok);$('google-link').setAttribute('aria-disabled',String(!ok));$('google-link').tabIndex=ok?0:-1;}
$('confirm').addEventListener('change',()=>{setConfirmed();if($('confirm').checked)reach('confirm');});$('draft-text').addEventListener('input',()=>{$('confirm').checked=false;setConfirmed();});$('copy-draft').addEventListener('click',()=>{track('copy');copy($('draft-text').value,'copy-status',{copied:t('copied'),copyFail:t('copyFail')});});$('google-link').addEventListener('click',e=>{if($('google-link').getAttribute('aria-disabled')==='true'||routeBlocks()){e.preventDefault();return;}track('google');});
document.querySelectorAll('.direct-google').forEach(a=>a.addEventListener('click',e=>{if(routeBlocks()){e.preventDefault();return;}track('direct');}));

// LP redesign: the page has three views on one URL. '#create' = QR作成画面, a customer share link = お客さま画面, anything else = LP.
// No events are sent from the LP or the create view (the funnel counts only the customer screen).
function route(fromHashChange){
  if(document.body.dataset.view==='customer')return;
  const h=location.hash;
  if(h==='#create'){document.body.dataset.view='create';window.scrollTo(0,0);if(fromHashChange)$('create-title').focus({preventScroll:true});return;}
  const wasCreate=document.body.dataset.view==='create';
  document.body.dataset.view='lp';
  const target=h.length>1&&document.getElementById(h.slice(1));
  // v12: FAQ groups and answers are closed <details>; a link to one (#faq-rule, #data-all …) opens it and the groups around it
  for(let d=target&&target.closest('#lp details');d;d=d.parentElement.closest('details'))d.open=true;
  if(wasCreate&&target)target.scrollIntoView();
}
window.addEventListener('hashchange',()=>route(true));
route(false);

// Sample QR on the LP poster mock-ups: it encodes this page's own address only (no store, no review link).
function sampleQr(id){const el=$(id);if(!el||typeof qrcode!=='function'||document.body.dataset.view==='customer')return;try{const q=qrcode(0,'M');q.addData(location.origin+'/');q.make();el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});el.querySelector('svg').setAttribute('aria-hidden','true');}catch{el.textContent='';}}
sampleQr('hero-qr');sampleQr('poster-qr');

// Phone bottom bar (below 1024px): hidden while the hero's own buttons are on screen (the first view shows one set of actions)
// and while the 試用 form is on screen (the bar would cover its button).
(function(){const bar=$('sticky-cta'),hero=document.querySelector('.hero-actions'),form=$('trial');if(!bar||!hero||!form||!('IntersectionObserver' in window))return;
  const off={hero:true,form:false};const sync=()=>bar.classList.toggle('is-off',off.hero||off.form);sync();
  new IntersectionObserver(es=>{for(const e of es)off.hero=e.isIntersecting||e.boundingClientRect.top>0;sync();}).observe(hero);
  new IntersectionObserver(es=>{for(const e of es)off.form=e.isIntersecting;sync();}).observe(form);})();

// LP v6 slides: the header numbers mark the slide in view (aria-current). The 1024px+ layout keeps the 試用 form fixed on the right,
// so links to #trial focus its first field instead of scrolling the page to the form's place in the document.
(function(){const links=[...document.querySelectorAll('.owner-nav a[href^="#"]')];const slides=links.map(a=>document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if(slides.length&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting)for(const a of links){if(a.getAttribute('href')==='#'+e.target.id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');}},{rootMargin:'-45% 0px -50% 0px'});slides.forEach(s=>io.observe(s));}
  const box=$('trial');document.querySelectorAll('#lp a[href="#trial"]').forEach(a=>a.addEventListener('click',e=>{if(!box||getComputedStyle(box).position!=='sticky')return;e.preventDefault();const f=$('trial-done').classList.contains('hidden')?$('trial-store'):$('trial-done');f.focus({preventScroll:true});}));})();

// LP v2: sections fade in once when scrolled into view. Hidden only after this runs (html.reveal-on), so without JS,
// without IntersectionObserver, or with prefers-reduced-motion everything stays visible and still.
(function(){const els=document.querySelectorAll('#lp .reveal');if(!els.length||document.body.dataset.view==='customer'||!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}},{rootMargin:'0px 0px -6% 0px'});
  els.forEach(el=>io.observe(el));document.documentElement.classList.add('reveal-on');})();

// 試用店舗募集フォーム → POST /api/trial (worker.mjs validTrial: 店名80・お名前40・連絡先120・ひとこと400字、改行は「ひとこと」だけ)
const TRIAL_MESSAGES={empty:'店名・お名前・連絡先を入力してください。',contact:'連絡先は、メールアドレスか電話番号（10〜15桁）で入力してください。',sending:'送信しています…',invalid:'入力内容を確認してください。記号の「<」「>」は使えません。店名・お名前・連絡先は1行で入力してください。',limited:'同じ端末からの送信が続いたため、今日は受け付けを止めています。明日以降にもう一度お送りください。',failed:'いま受け付けられませんでした。時間をおいて、もう一度お送りください。'};
function trialContactOk(v){const n=v.normalize('NFKC');return /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/u.test(n)||/^\+?\d{10,15}$/.test(n.replace(/[\s\-‐－ー()]/gu,''));}
function trialSay(key){const el=$('trial-status');el.textContent=TRIAL_MESSAGES[key];el.classList.toggle('is-error',key!=='sending');}
$('trial-form').addEventListener('submit',async e=>{e.preventDefault();
  const body={storeName:$('trial-store').value.trim(),name:$('trial-name').value.trim(),contact:$('trial-contact').value.trim(),message:$('trial-message').value.trim(),website:$('trial-website').value};
  if(!body.storeName||!body.name||!body.contact)return trialSay('empty');
  if(!trialContactOk(body.contact))return trialSay('contact');
  $('trial-submit').disabled=true;trialSay('sending');
  try{
    const res=await fetch('/api/trial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    if(res.ok){$('trial-form').reset();$('trial-form').classList.add('hidden');$('trial-done').classList.remove('hidden');$('trial-done').focus();return;}
    trialSay(res.status===429?'limited':res.status===400||res.status===413?'invalid':'failed');
  }catch{trialSay('failed');}
  finally{$('trial-submit').disabled=false;}
});


// LP videos (the demo and the v7 short loops, all video.lp-video): muted, play only while on screen, never with reduced motion.
// With reduced motion (or without IntersectionObserver) they stay on the poster frame, and the loops get controls so they can still be played by hand.
(function(){const vs=[...document.querySelectorAll('#lp video.lp-video')];if(!vs.length)return;
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){vs.forEach(v=>{v.controls=true;});return;}
  const io=new IntersectionObserver(es=>{for(const e of es){const v=e.target;if(e.isIntersecting)v.play().catch(()=>{});else v.pause();}},{threshold:.5});vs.forEach(v=>io.observe(v));})();
