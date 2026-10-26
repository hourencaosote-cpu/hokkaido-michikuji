export const fortuneGrades=[
 {key:'daikichi',label:'大吉',comments:['思いきった寄り道に、いい出会い。','ひとつ先の道に、旅のごほうび。','今日は、ちょっと遠回りしてみよう。']},
 {key:'chukichi',label:'中吉',comments:['おいしい偶然が、待っているかも。','気になった景色に、足を止めよう。','いつもの道にも、新しい発見。']},
 {key:'shokichi',label:'小吉',comments:['小さな寄り道が、いい思い出に。','急がず、のんびり。いい旅を。','ひと休みから、旅が広がる。']},
 {key:'kichi',label:'吉',comments:['今日のペースで、気ままにどうぞ。','次の一駅を、楽しんでいこう。','何気ない寄り道を、特別な一日に。']}
];
export const fortuneByKey=key=>fortuneGrades.find(g=>g.key===key)||null;
