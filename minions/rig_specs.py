# 부위 자르기 설정 (원본 PNG 픽셀 좌표). 순서 = 그리는 순서(뒤→앞). 'body'는 나머지 전부.
# poly: 부위 영역, pivot: 회전 중심, fill: 몸통이 이 부위 밑으로 메워 들어갈 폭(px, 앞 부위만), grid: 변형용 격자 [가로,세로]
S = {}
S['minions/water/tier0.png'] = [
  dict(name='legB', poly=[(52,238),(112,232),(116,298),(50,298)], pivot=(84,242), role='legB', over=16),
  dict(name='legF', poly=[(138,244),(202,244),(204,298),(134,298)], pivot=(168,250), role='legF', over=16),
  dict(name='body', grid=[3,4], role='jiggle'),
  dict(name='head', poly=[(18,0),(214,0),(214,150),(190,160),(150,166),(100,166),(72,158),(18,118)], pivot=(130,162), role='head', fill=16, grid=[3,3]),
  dict(name='weapon', poly=[(186,168),(214,150),(298,40),(325,40),(325,125),(258,214),(240,262),(192,262),(182,214)], pivot=(192,182), role='melee', fill=16, tip=(318,72)),
]
S['minions/fire/tier0.png'] = [
  dict(name='legB', poly=[(42,292),(108,286),(112,354),(38,354)], pivot=(78,292), role='legB', over=16),
  dict(name='legF', poly=[(124,282),(188,286),(192,354),(118,354)], pivot=(156,288), role='legF', over=16),
  dict(name='body', grid=[3,4], role='flameBody'),
  dict(name='head', poly=[(40,0),(222,0),(226,210),(196,229),(100,229),(44,200)], pivot=(150,226), role='flameHead', fill=16, grid=[3,6]),
  dict(name='weapon', poly=[(192,236),(228,214),(298,116),(329,116),(329,178),(272,282),(206,312),(178,282)], pivot=(196,256), role='melee', fill=16, tip=(322,150)),
]
S['minions/rock/tier0.png'] = [
  dict(name='armB', poly=[(0,112),(58,108),(62,192),(0,192)], pivot=(52,132), role='armB', over=12, fill=12),
  dict(name='legB', poly=[(44,178),(98,176),(100,222),(42,222)], pivot=(70,182), role='legB', over=16),
  dict(name='legF', poly=[(122,182),(178,182),(180,222),(120,222)], pivot=(150,186), role='legF', over=16),
  dict(name='body', grid=[3,3], role='body'),
  dict(name='weapon', poly=[(176,128),(192,60),(275,60),(275,152),(232,220),(182,220),(174,166)], pivot=(186,150), role='melee', fill=14, tip=(262,120)),
]
S['minions/water/tier1.png'] = [
  dict(name='body', grid=[3,5], role='jiggle'),
  dict(name='head', poly=[(141,18),(332,18),(332,226),(128,226),(128,130),(141,100)], pivot=(250,222), role='head', fill=16, grid=[3,3]),
  dict(name='weapon', poly=[(0,0),(140,0),(140,100),(127,128),(127,248),(152,252),(152,302),(160,302),(176,482),(138,482),(120,302),(86,292),(76,215),(0,215)], pivot=(134,280), role='staff', fill=20, excl=dict(blue=1, below=306), tip=(70,75)),
]
S['minions/fire/tier1.png'] = [
  dict(name='body', grid=[3,5], role='flameBody'),
  dict(name='head', poly=[(28,38),(250,38),(256,268),(200,276),(120,276),(60,252),(28,200)], pivot=(180,270), role='flameHead', fill=16, grid=[3,6]),
  dict(name='weapon', poly=[(248,0),(362,0),(362,172),(306,202),(302,268),(322,278),(322,322),(312,332),(284,506),(226,506),(254,322),(254,278),(268,202),(248,150)], pivot=(290,302), role='staff', fill=6, tip=(305,120)),
]
S['minions/rock/tier1.png'] = [
  dict(name='legB', poly=[(80,328),(152,298),(156,432),(48,432),(52,346)], pivot=(110,312), role='legB', over=16),
  dict(name='legF', poly=[(168,318),(249,318),(249,388),(262,392),(262,432),(168,432)], pivot=(212,326), role='legF', over=16),
  dict(name='body', grid=[3,4], role='body'),
  dict(name='head', poly=[(54,0),(286,0),(286,168),(250,186),(110,186),(54,160)], pivot=(175,182), role='head', fill=16),
  dict(name='weapon', poly=[(240,190),(268,138),(342,138),(371,248),(371,432),(266,432),(264,392),(250,386),(250,300),(244,262)], pivot=(258,206), role='bag', fill=14, tip=(310,320)),
]
S['minions/water/tier2.png'] = [
  dict(name='legB', poly=[(84,408),(176,398),(182,512),(74,512)], pivot=(130,412), role='legB', over=16),
  dict(name='legF', poly=[(224,418),(318,420),(318,512),(224,512)], pivot=(270,424), role='legF', over=16),
  dict(name='body', grid=[3,4], role='jiggle'),
  dict(name='head', poly=[(150,0),(346,0),(346,170),(330,234),(206,240),(196,150),(150,118)], pivot=(265,236), role='head', fill=16),
  dict(name='weapon', poly=[(104,331),(276,358),(300,286),(471,286),(471,512),(318,512),(318,420),(300,420),(276,404),(104,368)], polys=[[(0,308),(54,308),(56,368),(0,368)]], pivot=(112,350), role='hammer', fill=24, tip=(390,400)),
]
S['minions/fire/tier2.png'] = [
  dict(name='legB', poly=[(148,394),(226,394),(232,482),(148,482)], pivot=(190,398), role='legB', over=16),
  dict(name='legF', poly=[(228,380),(332,380),(352,512),(238,512)], pivot=(280,386), role='legF', over=16),
  dict(name='body', grid=[3,4], role='flameBody'),
  dict(name='head', poly=[(140,0),(422,0),(422,240),(372,266),(270,272),(240,242),(226,172),(140,130)], pivot=(310,266), role='flameHead', fill=16, grid=[4,6]),
  dict(name='weapon', poly=[(0,318),(118,318),(186,328),(192,402),(152,412),(150,502),(0,502)], pivot=(150,322), role='hammer', fill=14, tip=(70,410)),
]
S['minions/rock/tier2.png'] = [
  dict(name='legB', poly=[(110,428),(216,418),(216,512),(78,512),(78,456)], pivot=(160,430), role='legB', over=16),
  dict(name='legF', poly=[(254,428),(402,428),(402,512),(254,512)], pivot=(326,434), role='legF', over=16),
  dict(name='body', grid=[3,4], role='body'),
  dict(name='head', poly=[(184,0),(376,0),(372,150),(346,250),(300,266),(240,266),(210,250),(196,150)], pivot=(280,262), role='head', fill=16),
  dict(name='weapon', poly=[(334,282),(380,226),(470,198),(589,198),(589,448),(400,444),(334,422)], pivot=(352,272), role='punch', fill=24, tip=(500,330)),
]
S['dragons/dragon.png'] = [
  dict(name='wingF', poly=[(380,48),(500,56),(506,120),(492,160),(472,200),(450,224),(420,224),(395,195),(378,170)], pivot=(482,180), role='wingF', over=30, overInto=['head']),
  dict(name='tail', poly=[(28,282),(252,288),(282,330),(240,396),(150,422),(36,442)], pivot=(276,350), role='tail', grid=[6,2], over=14),
  dict(name='body', grid=[3,3], role='body'),
  dict(name='wingN', poly=[(0,0),(332,0),(392,40),(390,100),(374,120),(380,165),(398,200),(428,232),(436,262),(400,300),(330,300),(300,268),(228,300),(190,300),(0,200)], pivot=(405,262), role='wingN', fill=16, grid=[3,3]),
  dict(name='head', poly=[(452,0),(753,0),(753,244),(640,246),(560,226),(514,178),(504,118),(492,62)], pivot=(520,190), role='head', fill=18),
  dict(name='jaw', parent='head', poly=[(600,200),(742,204),(736,238),(618,244)], pivot=(616,214), role='jaw', fill=0, mouth=True, tip=(735,205)),
]
