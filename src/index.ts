// import * as AllShaders from "./shaders.js";
import AllShaders from "./shaders";
import GraphRenderer from "./graph_renderer"

// We "cast" the instance"
var canvas = <HTMLCanvasElement> document.getElementById("main-canvas");
var renderer = new GraphRenderer(canvas);

// We add some points
// var size = 500;
// var positions = new Array(size);
// for (var i = 0; i < size; i += 2) {
//   // positions[i] = -1 + 2* (i/(size - 2));
//   // positions[i + 1] = 2 * Math.random() - 1;
//   var offset = -2 + 4 * (i / (size - 2));
//   positions[i] = offset;
//   positions[i + 1] = offset + 0.3 * Math.random(); - 0.15;
// }

var positions = [
-2, -1.7334850105184012,
-1.9839357429718876, -1.8478119435300127,
-1.9678714859437751, -1.8626693035208333,
-1.9518072289156627, -1.9286381769495675,
-1.9357429718875503, -1.85518538261367,
-1.9196787148594376, -1.660766943414948,
-1.9036144578313252, -1.6710231920827312,
-1.8875502008032128, -1.8441829292468384,
-1.8714859437751004, -1.6053134452238895,
-1.855421686746988, -1.5866667996541932,
-1.8393574297188755, -1.7425833359813103,
-1.823293172690763, -1.5338153125950753,
-1.8072289156626506, -1.7147287068331345,
-1.7911646586345382, -1.5464053784541008,
-1.7751004016064258, -1.5550773920370484,
-1.7590361445783134, -1.6257185725253234,
-1.7429718875502007, -1.6623421262901157,
-1.7269076305220883, -1.5713373331415086,
-1.7108433734939759, -1.4518910279773363,
-1.6947791164658634, -1.4933251598232355,
-1.678714859437751, -1.5677927658364161,
-1.6626506024096386, -1.470013349252069,
-1.6465863453815262, -1.5502331701268446,
-1.6305220883534137, -1.4988067878203821,
-1.6144578313253013, -1.3670222163195755,
-1.5983935742971886, -1.4181744208149691,
-1.5823293172690764, -1.2938212178988553,
-1.5662650602409638, -1.457608665139249,
-1.5502008032128514, -1.4150464709328463,
-1.534136546184739, -1.4235391891172666,
-1.5180722891566265, -1.4261456053704489,
-1.502008032128514, -1.4829135241751779,
-1.4859437751004017, -1.4559845082717955,
-1.4698795180722892, -1.2686534516681718,
-1.4538152610441766, -1.3332969056534356,
-1.4377510040160644, -1.1810883774677197,
-1.4216867469879517, -1.3255941106946492,
-1.4056224899598395, -1.3652362306153931,
-1.3895582329317269, -1.2463798629584306,
-1.3734939759036144, -1.2000432525265738,
-1.357429718875502, -1.1406969530268711,
-1.3413654618473896, -1.1004671275110762,
-1.3253012048192772, -1.0866782354793794,
-1.3092369477911645, -1.216245362296972,
-1.2931726907630523, -1.062802005202818,
-1.2771084337349397, -1.268684596275336,
-1.2610441767068274, -1.1568074243187618,
-1.2449799196787148, -1.2009127336858596,
-1.2289156626506024, -1.1869791784058645,
-1.21285140562249, -1.130664013322233,
-1.1967871485943775, -1.012656306612103,
-1.180722891566265, -1.0862048842374492,
-1.1646586345381527, -0.9498463074656864,
-1.1485943775100402, -0.8498763108681835,
-1.1325301204819276, -1.0607002427754002,
-1.1164658634538154, -0.9144063534977859,
-1.1004016064257027, -1.0062393384307444,
-1.0843373493975905, -0.9413153394125207,
-1.0682730923694779, -1.0070215248638097,
-1.0522088353413654, -1.0440900630405265,
-1.036144578313253, -0.7553576034622905,
-1.0200803212851406, -0.7655234081066269,
-1.0040160642570282, -0.7259058638860538,
-0.9879518072289157, -0.8744344253382602,
-0.9718875502008033, -0.8501434768898686,
-0.9558232931726907, -0.84178336029167,
-0.9397590361445782, -0.6584039307024063,
-0.9236947791164658, -0.8669063980473279,
-0.9076305220883534, -0.6847019207339712,
-0.891566265060241, -0.7065929437076814,
-0.8755020080321285, -0.7166463072215282,
-0.8594377510040161, -0.7682901420522262,
-0.8433734939759037, -0.8275961221422178,
-0.8273092369477912, -0.578028984774284,
-0.8112449799196788, -0.6049612210611598,
-0.7951807228915662, -0.769942234675503,
-0.7791164658634537, -0.5891615535130825,
-0.7630522088353413, -0.6152087391598958,
-0.7469879518072289, -0.4946580311979217,
-0.7309236947791165, -0.45152693720770015,
-0.714859437751004, -0.5373302631527193,
-0.6987951807228916, -0.6904668378908208,
-0.6827309236947792, -0.4691830713303362,
-0.6666666666666667, -0.5973145566229301,
-0.6506024096385543, -0.6258909475738621,
-0.6345381526104417, -0.5508827119058598,
-0.6184738955823292, -0.5285392846223713,
-0.6024096385542168, -0.3720446204466834,
-0.5863453815261044, -0.3340261116338658,
-0.570281124497992, -0.5229382057329273,
-0.5542168674698795, -0.2780685502059849,
-0.5381526104417671, -0.26578865558528136,
-0.5220883534136547, -0.33150075138893287,
-0.5060240963855422, -0.22514228214093296,
-0.4899598393574298, -0.34002385680584657,
-0.47389558232931717, -0.42484754981142225,
-0.45783132530120474, -0.3770274137303001,
-0.4417670682730923, -0.1840271392339225,
-0.4257028112449799, -0.1996557807636312,
-0.40963855421686746, -0.2333943261269986,
-0.39357429718875503, -0.2802690509472816,
-0.3775100401606426, -0.33756280480006745,
-0.3614457831325302, -0.22076300607588203,
-0.34538152610441775, -0.3176513028115277,
-0.3293172690763053, -0.16657666265175575,
-0.31325301204819267, -0.2111088379854257,
-0.29718875502008024, -0.2531223910282989,
-0.2811244979919678, -0.13341035025353193,
-0.2650602409638554, -0.10466025079840524,
-0.24899598393574296, -0.1878433786667678,
-0.23293172690763053, -0.14587484445385823,
-0.2168674698795181, -0.020728520058110877,
-0.20080321285140568, -0.06676888965568736,
-0.18473895582329325, -0.07374498388545125,
-0.16867469879518082, -0.027903475460027555,
-0.15261044176706817, -0.11728396053197639,
-0.13654618473895574, 0.1560208901721578,
-0.12048192771084332, -0.004303317578076768,
-0.10441767068273089, 0.17260851209674716,
-0.08835341365461846, 0.15159498784709646,
-0.07228915662650603, 0.20487913070960379,
-0.05622489959839361, -0.04824088979927368,
-0.04016064257028118, 0.11143024852138403,
-0.024096385542168752, 0.1667128823639649,
-0.008032128514056325, 0.09939512586994327,
0.008032128514056325, 0.24836558205082232,
0.02409638554216853, 0.2713629888020418,
0.04016064257028118, 0.1556747427940801,
0.056224899598393385, 0.32080359239941164,
0.07228915662650603, 0.339136030563081,
0.08835341365461868, 0.38504639317097217,
0.10441767068273089, 0.19112861859357433,
0.12048192771084354, 0.3246388887738212,
0.13654618473895574, 0.26196015518772087,
0.1526104417670684, 0.4274522391690997,
0.1686746987951806, 0.22886208181022616,
0.18473895582329325, 0.24426775841620194,
0.20080321285140545, 0.4404689266578963,
0.2168674698795181, 0.49194537851740283,
0.2329317269076303, 0.3120659720884211,
0.24899598393574296, 0.3992382176473531,
0.2650602409638556, 0.3096325505687502,
0.2811244979919678, 0.35938765922453825,
0.29718875502008046, 0.29767731378943585,
0.31325301204819267, 0.4892813170465673,
0.3293172690763053, 0.39013587982517217,
0.3453815261044175, 0.48432771720425283,
0.3614457831325302, 0.40465599627934534,
0.3775100401606424, 0.5147253787216892,
0.39357429718875503, 0.5405538781066115,
0.4096385542168677, 0.5211948715597842,
0.4257028112449799, 0.526012477198274,
0.44176706827309253, 0.63991569471205,
0.45783132530120474, 0.7094304888507215,
0.4738955823293174, 0.5835680035550916,
0.4899598393574296, 0.7377652026121926,
0.5060240963855422, 0.8005855968831099,
0.5220883534136544, 0.6326290453146486,
0.5381526104417671, 0.821573319276039,
0.5542168674698793, 0.7519101392247671,
0.570281124497992, 0.6299173782939351,
0.5863453815261046, 0.810997747342963,
0.6024096385542168, 0.8608424687889665,
0.6184738955823295, 0.6698395280765878,
0.6345381526104417, 0.6421800144898193,
0.6506024096385543, 0.938504714327306,
0.6666666666666665, 0.7601614586421497,
0.6827309236947792, 0.8499616994807909,
0.6987951807228914, 0.9658232632516152,
0.714859437751004, 0.8218360176446381,
0.7309236947791167, 1.0202890755407499,
0.7469879518072289, 0.8538094373443628,
0.7630522088353415, 0.9897114359622472,
0.7791164658634537, 0.9628727889661938,
0.7951807228915664, 1.0935205108723438,
0.8112449799196786, 1.0538940790307483,
0.8273092369477912, 1.0242041933702155,
0.8433734939759034, 1.0773720829418194,
0.8594377510040161, 0.9546138390553773,
0.8755020080321283, 1.0459522064063018,
0.891566265060241, 1.0765734427610483,
0.9076305220883536, 1.0580965224213066,
0.9236947791164658, 0.9830735464480445,
0.9397590361445785, 1.049042197397415,
0.9558232931726907, 0.9842462984003482,
0.9718875502008033, 1.0121136896846383,
0.9879518072289155, 1.0541430816032036,
1.0040160642570282, 1.197604019737177,
1.0200803212851404, 1.1129073857981575,
1.036144578313253, 1.2933209393518676,
1.0522088353413657, 1.276456352893792,
1.0682730923694779, 1.2575244589360028,
1.0843373493975905, 1.148420022468863,
1.1004016064257027, 1.2602370547827753,
1.1164658634538154, 1.1610311270063234,
1.1325301204819276, 1.2225738324766018,
1.1485943775100402, 1.3446350136467096,
1.1646586345381524, 1.213144826759252,
1.180722891566265, 1.2537409626902245,
1.1967871485943773, 1.3545554183215425,
1.21285140562249, 1.3065454386758248,
1.2289156626506026, 1.2567515324598364,
1.2449799196787148, 1.5286830381283791,
1.2610441767068274, 1.45398370464869,
1.2771084337349397, 1.5010429167096133,
1.2931726907630523, 1.385112367376366,
1.3092369477911645, 1.6066610665665855,
1.3253012048192772, 1.5057730712824642,
1.3413654618473894, 1.4910014999393515,
1.357429718875502, 1.5252620588210135,
1.3734939759036147, 1.6375829193334783,
1.3895582329317269, 1.6305002293828608,
1.4056224899598395, 1.5062781913358485,
1.4216867469879517, 1.4793680356782697,
1.4377510040160644, 1.6720764002329727,
1.4538152610441766, 1.662948782171763,
1.4698795180722892, 1.6272426426764206,
1.4859437751004014, 1.5625410335653858,
1.502008032128514, 1.580404621788898,
1.5180722891566263, 1.7817692023551002,
1.534136546184739, 1.6146151757056881,
1.5502008032128516, 1.834893916600389,
1.5662650602409638, 1.6519513269056052,
1.5823293172690764, 1.743357199803264,
1.5983935742971886, 1.6453467932073202,
1.6144578313253013, 1.791635939231253,
1.6305220883534135, 1.6750978350428096,
1.6465863453815262, 1.7435089260723393,
1.6626506024096384, 1.8681897274220658,
1.678714859437751, 1.9073662916606826,
1.6947791164658637, 1.9761814338651487,
1.7108433734939759, 1.7273660352045195,
1.7269076305220885, 1.8466689191454444,
1.7429718875502007, 1.8650291288551661,
1.7590361445783134, 1.8930556312308005,
1.7751004016064256, 2.007831574030828,
1.7911646586345382, 1.972425434146261,
1.8072289156626504, 1.8905595906998478,
1.823293172690763, 2.0744321463344417,
1.8393574297188753, 1.9620871542863008,
1.855421686746988, 1.9888931235001825,
1.8714859437751006, 2.0742933896641875,
1.8875502008032128, 2.063268665376598,
1.9036144578313254, 2.0287367001940897,
1.9196787148594376, 2.055983940369452,
1.9357429718875503, 2.020926416190516,
1.9518072289156625, 2.1763803294112973,
1.9678714859437751, 2.224794444286367,
1.9839357429718874, 2.2469714084431005,
2, 2.2755625788279916];

// We add our positions
renderer.AddPoints(positions);

// We updathe boxes
var offset_x_box = <HTMLInputElement> document.getElementById("offset-x");
var offset_y_box = <HTMLInputElement> document.getElementById("offset-y");

function UpdateInfo() {
  offset_x_box.value = String(renderer.state.graph_info.offset[0]);
  offset_y_box.value = String(renderer.state.graph_info.offset[1]);
}

// We create a fast "game-loop"
function DrawScene(time: any) {
  renderer.Draw();
  UpdateInfo();
  requestAnimationFrame(DrawScene);
}

requestAnimationFrame(DrawScene);
