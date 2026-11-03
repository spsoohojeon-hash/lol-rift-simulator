// Champion names are fetched at runtime from Riot Data Dragon (ko_KR).
// This fallback list only keeps the UI functional if the CDN is unavailable.
window.LOL_DATA = Object.freeze({
  fallback: [{"id":"Garen","name":"가렌"},{"id":"Galio","name":"갈리오"},{"id":"Gangplank","name":"갱플랭크"},{"id":"Gragas","name":"그라가스"},{"id":"Graves","name":"그레이브즈"},{"id":"Gwen","name":"그웬"},{"id":"Gnar","name":"나르"},{"id":"Nami","name":"나미"},{"id":"Nasus","name":"나서스"},{"id":"Naafiri","name":"나피리"},{"id":"Nocturne","name":"녹턴"},{"id":"Nunu","name":"누누와 윌럼프"},{"id":"Nidalee","name":"니달리"},{"id":"Neeko","name":"니코"},{"id":"Nilah","name":"닐라"},{"id":"Darius","name":"다리우스"},{"id":"Diana","name":"다이애나"},{"id":"Draven","name":"드레이븐"},{"id":"Ryze","name":"라이즈"},{"id":"Rakan","name":"라칸"},{"id":"Rammus","name":"람머스"},{"id":"Lux","name":"럭스"},{"id":"Rumble","name":"럼블"},{"id":"Renata","name":"레나타 글라스크"},{"id":"Renekton","name":"레넥톤"},{"id":"Leona","name":"레오나"},{"id":"RekSai","name":"렉사이"},{"id":"Rell","name":"렐"},{"id":"Rengar","name":"렝가"},{"id":"Lucian","name":"루시안"},{"id":"Lulu","name":"룰루"},{"id":"Leblanc","name":"르블랑"},{"id":"LeeSin","name":"리 신"},{"id":"Riven","name":"리븐"},{"id":"Lissandra","name":"리산드라"},{"id":"Lillia","name":"릴리아"},{"id":"MasterYi","name":"마스터 이"},{"id":"Maokai","name":"마오카이"},{"id":"Malzahar","name":"말자하"},{"id":"Malphite","name":"말파이트"},{"id":"Mordekaiser","name":"모데카이저"},{"id":"Morgana","name":"모르가나"},{"id":"DrMundo","name":"문도 박사"},{"id":"MissFortune","name":"미스 포츈"},{"id":"Milio","name":"밀리오"},{"id":"Bard","name":"바드"},{"id":"Varus","name":"바루스"},{"id":"Vi","name":"바이"},{"id":"Veigar","name":"베이가"},{"id":"Vayne","name":"베인"},{"id":"Vex","name":"벡스"},{"id":"Belveth","name":"벨베스"},{"id":"Volibear","name":"볼리베어"},{"id":"Braum","name":"브라움"},{"id":"Brand","name":"브랜드"},{"id":"Vladimir","name":"블라디미르"},{"id":"Blitzcrank","name":"블리츠크랭크"},{"id":"Viego","name":"비에고"},{"id":"Viktor","name":"빅토르"},{"id":"Poppy","name":"뽀삐"},{"id":"Samira","name":"사미라"},{"id":"Sion","name":"사이온"},{"id":"Sylas","name":"사일러스"},{"id":"Shaco","name":"샤코"},{"id":"Senna","name":"세나"},{"id":"Seraphine","name":"세라핀"},{"id":"Sejuani","name":"세주아니"},{"id":"Sett","name":"세트"},{"id":"Sona","name":"소나"},{"id":"Soraka","name":"소라카"},{"id":"Shen","name":"쉔"},{"id":"Shyvana","name":"쉬바나"},{"id":"Smolder","name":"스몰더"},{"id":"Swain","name":"스웨인"},{"id":"Skarner","name":"스카너"},{"id":"Sivir","name":"시비르"},{"id":"XinZhao","name":"신 짜오"},{"id":"Syndra","name":"신드라"},{"id":"Singed","name":"신지드"},{"id":"Thresh","name":"쓰레쉬"},{"id":"Ahri","name":"아리"},{"id":"Amumu","name":"아무무"},{"id":"AurelionSol","name":"아우렐리온 솔"},{"id":"Ivern","name":"아이번"},{"id":"Azir","name":"아지르"},{"id":"Akali","name":"아칼리"},{"id":"Akshan","name":"아크샨"},{"id":"Aatrox","name":"아트록스"},{"id":"Aphelios","name":"아펠리오스"},{"id":"Alistar","name":"알리스타"},{"id":"Annie","name":"애니"},{"id":"Anivia","name":"애니비아"},{"id":"Ashe","name":"애쉬"},{"id":"Yasuo","name":"야스오"},{"id":"Ekko","name":"에코"},{"id":"Elise","name":"엘리스"},{"id":"MonkeyKing","name":"오공"},{"id":"Ornn","name":"오른"},{"id":"Orianna","name":"오리아나"},{"id":"Olaf","name":"올라프"},{"id":"Yone","name":"요네"},{"id":"Yorick","name":"요릭"},{"id":"Udyr","name":"우디르"},{"id":"Urgot","name":"우르곳"},{"id":"Warwick","name":"워윅"},{"id":"Yuumi","name":"유미"},{"id":"Irelia","name":"이렐리아"},{"id":"Evelynn","name":"이블린"},{"id":"Ezreal","name":"이즈리얼"},{"id":"Illaoi","name":"일라오이"},{"id":"JarvanIV","name":"자르반 4세"},{"id":"Xayah","name":"자야"},{"id":"Zyra","name":"자이라"},{"id":"Zac","name":"자크"},{"id":"Janna","name":"잔나"},{"id":"Jax","name":"잭스"},{"id":"Zed","name":"제드"},{"id":"Xerath","name":"제라스"},{"id":"Zeri","name":"제리"},{"id":"Jayce","name":"제이스"},{"id":"Zoe","name":"조이"},{"id":"Ziggs","name":"직스"},{"id":"Jhin","name":"진"},{"id":"Zilean","name":"질리언"},{"id":"Jinx","name":"징크스"},{"id":"Chogath","name":"초가스"},{"id":"Karma","name":"카르마"},{"id":"Camille","name":"카밀"},{"id":"Kassadin","name":"카사딘"},{"id":"Karthus","name":"카서스"},{"id":"Cassiopeia","name":"카시오페아"},{"id":"Kaisa","name":"카이사"},{"id":"Khazix","name":"카직스"},{"id":"Katarina","name":"카타리나"},{"id":"Kalista","name":"칼리스타"},{"id":"Kennen","name":"케넨"},{"id":"Caitlyn","name":"케이틀린"},{"id":"Kayn","name":"케인"},{"id":"Kayle","name":"케일"},{"id":"KogMaw","name":"코그모"},{"id":"Corki","name":"코르키"},{"id":"Quinn","name":"퀸"},{"id":"KSante","name":"크산테"},{"id":"Kled","name":"클레드"},{"id":"Qiyana","name":"키아나"},{"id":"Kindred","name":"킨드레드"},{"id":"Taric","name":"타릭"},{"id":"Talon","name":"탈론"},{"id":"Taliyah","name":"탈리야"},{"id":"TahmKench","name":"탐 켄치"},{"id":"Trundle","name":"트런들"},{"id":"Tristana","name":"트리스타나"},{"id":"Tryndamere","name":"트린다미어"},{"id":"TwistedFate","name":"트위스티드 페이트"},{"id":"Twitch","name":"트위치"},{"id":"Teemo","name":"티모"},{"id":"Pyke","name":"파이크"},{"id":"Pantheon","name":"판테온"},{"id":"Fiddlesticks","name":"피들스틱"},{"id":"Fiora","name":"피오라"},{"id":"Fizz","name":"피즈"},{"id":"Heimerdinger","name":"하이머딩거"},{"id":"Hecarim","name":"헤카림"},{"id":"Hwei","name":"흐웨이"},{"id":"Ambessa","name":"암베사"},{"id":"Aurora","name":"오로라"},{"id":"Mel","name":"멜"},{"id":"Yunara","name":"유나라"}],
  reference: {
  "TOP": {
    "accel": [
      "Jayce",
      "Olaf",
      "Ambessa"
    ],
    "flex": [
      "Rumble",
      "Gnar",
      "Kennen",
      "Jax",
      "Aatrox"
    ],
    "brake": [
      "KSante",
      "Gragas",
      "Camille",
      "Yorick"
    ],
    "growth": [],
    "tank": [
      "Sion",
      "DrMundo",
      "Ornn"
    ]
  },
  "JUNGLE": {
    "accel": [
      "LeeSin",
      "Qiyana"
    ],
    "flex": [
      "RekSai",
      "JarvanIV",
      "XinZhao"
    ],
    "brake": [],
    "growth": [
      "Pantheon",
      "Vi",
      "Nocturne",
      "MonkeyKing"
    ],
    "tank": [
      "Skarner",
      "Sejuani",
      "Maokai"
    ]
  },
  "MID": {
    "accel": [
      "Cassiopeia",
      "Ryze",
      "Karthus",
      "Syndra"
    ],
    "flex": [
      "Orianna",
      "Ahri",
      "Taliyah",
      "Zoe"
    ],
    "brake": [
      "Galio",
      "Anivia",
      "TwistedFate",
      "Annie",
      "Lissandra"
    ],
    "growth": [
      "Yone",
      "Akali"
    ],
    "tank": []
  },
  "ADC": {
    "accel": [
      "Ezreal",
      "Caitlyn",
      "Lucian"
    ],
    "flex": [
      "Ashe",
      "Kalista",
      "Xayah"
    ],
    "brake": [
      "Jhin",
      "MissFortune",
      "Ziggs",
      "Corki"
    ],
    "growth": [
      "Kaisa",
      "Zeri",
      "Aphelios",
      "Sivir"
    ],
    "tank": []
  },
  "SUPPORT": {
    "accel": [],
    "flex": [],
    "brake": [],
    "growth": [],
    "tank": []
  }
},
  categories: {accel:"가속",flex:"상대 의존",brake:"브레이크",growth:"성장",tank:"탱",unknown:"미확인"},
  categoryColors: {accel:"#fa6c70",flex:"#b18aea",brake:"#68b7f9",growth:"#f7cf6a",tank:"#74c9a2",unknown:"#8494ac"},
  lanes:["TOP","JUNGLE","MID","ADC","SUPPORT"]
});
