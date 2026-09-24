# نظام حركة المرور الذكي — دليل علمي مُعمّق

> **الاسم المختصر:** "Smart Traffic System" · **العنوان الفرعي:** "Embedded Control & Reliability Simulation"
>
> **منضدة بحثية وتعليمية قائمة على المتصفح** تحاكي وحدة تحكم بإشارات المرور مبنية حول
> تقنيتين متنافستين للموقّتات — "NE555" (نوع "bipolar") و"К561ТЛ1" (عبارة عن "CMOS Schmitt trigger")
> — وتحدّد كمية موثوقيتها ودقتها وتحملها للضوضاء داخل نموذج متكامل تفاعلي لوحدة تحكم مدمجة.
>
> جميع الرسوم البيانية في هذا المستند مصممة لتُعرض على خلفية **داكنة / شبه سوداء** لصفحة
> "GitHub README" (نظام ألوان دلالي ثابت). تُبقي تسميات المخططات على المصطلحات التقنية
> بالإنجليزية حفاظاً على الدقة والتوحيد.

---

## الفهرس

1. [ما هذا المشروع](#١-ما-هذا-المشروع)
2. [السياق الهندسي وصياغة المشكلة](#٢-السياق-الهندسي-وصياغة-المشكلة)
3. [تقنيتا الموقّت](#٣-تقنيتا-الموقّت)
4. [بنية النظام](#٤-بنية-النظام)
5. [آلة الحالات المحدودة لإشارات المرور](#٥-آلة-الحالات-المحدودة-لإشارات-المرور)
6. [النظام الفرعي لاستشعار البيئة](#٦-النظام-الفرعي-لاستشعار-البيئة)
7. [تحمّل الأعطال: "watchdog" والتكرار](#٧-تحمّل-الأعطال-watchdog-والتكرار)
8. [نموذج الموثوقية العشوائي](#٨-نموذج-الموثوقية-العشوائي)
9. [سلامة الإشارة: الساعة والأطوار والانحراف ("jitter")](#٩-سلامة-الإشارة-الساعة-والأطوار-والانحراف-jitter)
10. [الاستنتاجات](#١٠-الاستنتاجات)
11. [المسرد ("Glossary")](#١١-المسرد-glossary)
12. [الملحق: جدول المعاملات](#١٢-الملحق-جدول-المعاملات)

---

## ١. ما هذا المشروع

تطبيق ويب **مكتفٍ ذاتياً وبدون خادم ("server")** يتكون من أربع صفحات "HTML"
(`index.html` و`traffic_control_station.html` و`analytics.html` و`oscilloscope.html`).
كل صفحة عبارة عن محاكاة مستقلة مكتوبة بلغة "HTML/CSS/JS" نقية وتعمل بالكامل دون اتصال
بالإنترنت ("offline"). التطبيق ثنائي اللغة (الروسية / الإنجليزية) مع حفظ الخيار بين الصفحات
عبر "localStorage".

| الصفحة ("Page") | الدور |
|---|---|
| `index.html` | المحور / صفحة التنقل التي تصف المنضدة |
| `traffic_control_station.html` | وحدة تحكم مدمجة تفاعلية: أطوار الإشارات، و"watchdog"، والتبديل الاحتياطي ("failover")، والبيئة |
| `analytics.html` | محاكاة اختبار إجهاد للموثوقية ("MTBF"، الأخطاء، الطاقة، الدقة) |
| `oscilloscope.html` | "oscilloscope" لحظي: مسارات R/Y/G والساعة، والانحراف ("jitter")، ومخطط العين ("eye diagram") |

النظام الفيزيائي الذي تُنمذجه يتمثل في **وحدة تحكم مرورية حضرية واقعية**:

- "microcontroller" (بتقنية "Raspberry Pi GPIO") يدفع إشارات المرور عبر مشغّلات إخراج؛
- **مصدر توقيت الأطوار** (نواة المؤقّت) هو إما "К561ТЛ1" وإما "NE555"؛
- **"watchdog"** يُشرف على النواة الأساسية، وعند فقدان نبضة القلب ("heartbeat") يفعّل
  التبديل إلى النواة الاحتياطية عبر "relay"؛
- **نظام فرعي لاستشعار الحقل** (مقياس شدة الريح، مستشعر المطر، مستشعر الضوء،
  الثرمستور، جهة اتصال الإنذار الجوي، و"RTC") يكييف أزمنة الأطوار مع الطقس ووقت اليوم
  والحالات الطارئة؛
- **مستشعر الحركة "PIR"** يمكنه تمديد الطور الأخضر.

---

## ٢. السياق الهندسي وصياغة المشكلة

وحدة التحكم بإشارات المرور هي **نظام زمن حقيقي حساس للسلامة** ("safety-critical"):

- يجب أن تُنتج تسلسلاً مضموناً لا لبس فيه للأضواء (لا "أحمر + أخضر" أبداً)؛
- يجب أن تبقى صحيحة تحت تأثير الطاقة والحرارة والاهتزاز والضوضاء الكهرومغناطيسية؛
- فشل نواة التوقيت يجب ألّا يؤدي إلى تقاطع خطير — ومن هنا جاءت فكرة التكرار وإشراف "watchdog".

تصوغ المنضدة صفقة تقنية تقليدية بين تقنيتين للموقّتات:

1. **"NE555" (نوع "bipolar")** — الموقّت التماثلي الشهير: قدرة إخراج عالية، لكن تحمّل
   ضعيف نسبياً لضوضاء التغذية، ودقة حواف تبلغ ~50 ميكروثانية، وتيار خمول ~10 مللي أمبير،
   وغالباً ما يحتاج إلى إزالة الارتداد ("debounce").
2. **"К561ТЛ1" (عبر "CMOS Schmitt trigger"، من فئة "40106")** — أربع بوابات
   "Schmitt trigger" عاكسة على شريحة واحدة "DIP-14": استهلاك بالميكروأمبير (0.4 ميكروأمبير)،
   ودقة حواف ~5 ميكروثانية، وتحمّل ضوضاء جوهري بفضل "hysteresis" المدمجة، ولا حاجة
   لإزالة الارتداد؛ تخسر فقط في تيار الإخراج الخام (3.4 مللي أمبير مقابل 200 مللي أمبير).

السؤال الهندسي الذي تحاكيه كل الانحاء في هذا المشروع هو: **أي نواة أكثر موثوقية ودقة
وتحمّلاً للضوضاء كخيار لوحدة التحكم المرورية، وتحت أي ظروف يُبقي البنية الاحتياطية
التقاطع آمناً؟**

---

## ٣. تقنيتا الموقّت

### ٣-١ "NE555" — موقت ثنائي القطب (الوضع "astable")

في الوضع "astable"، يهتز موقّت "NE555" الكلاسيكي بشحن/تفريغ شبكة "RC" خارجية بين
عتبتي المقارن (⅓·VCC و⅔·VCC). دقة توقيته محدودة بما يلي:

- انزياحات إدخال "offset" و"hysteresis" في المقارنات؛
- اعتماد العتبات على جهد التغذية ودرجة الحرارة؛
- تسرب وأخطاء تناظر التبديل في الترانزستورات "bipolar".

النتائج التي يستخدمها المحاكي: **تحمّل ضعيف للضوضاء**، **دقة "50 µs"**،
**تيار تغذية "10 mA"**، الحاجة إلى "debounce"، وقدرة إخراج **"200 mA"**.

### ٣-٢ "К561ТЛ1" — عبر "CMOS Schmitt trigger"

يهتز عاكس "CMOS Schmitt trigger" بتغذية خارجه إلى مدخله عبر شبكة "RC"؛ وتكون عتبة
التبديل **جزءاً محدداً بدقة من جهد التغذية**، كما أن **نافذة "hysteresis"** الداخلية
تجعل الانتقالات محصنة ضد المدخلات البطيئة أو المزعجة. تستمد منطق "CMOS" التيار فقط أثناء
الانتقالات → استهلاك **"0.4 µA"** في حالة السكون. تلغي "hysteresis" الحاجة إلى
"debounce" خارجي وتُنتج حوافاً مستقرة بـ **~5 µs**.

### ٣-٣ المقارنة المباشرة (كما تُنمذج)

| المعامل | NE555 (bipolar) | К561ТЛ1 (CMOS) | الفائز |
|---|---|---|---|
| تيار التغذية | 10 mA (10000 µA) | 0.4 µA | К561ТЛ1 (~25,000× أقل) |
| تيار الإخراج | 200 mA | 3.4 mA | NE555 |
| دقة التبديل | 50 µs | 5 µs | К561ТЛ1 (أنقى 10 مرات) |
| تحمّل الضوضاء | ضعيف | ممتاز | К561ТЛ1 |
| "debounce" | مطلوب | غير مطلوب | К561ТЛ1 |
| معدل الإطلاق الخاطئ (نموذج) | 0.02 / حدث | 0.0 | К561ТЛ1 |
| معدل الإيجابيات الكاذبة لـ"WDT" (نموذج) | 0.05 % | 0.0 | К561ТЛ1 |

### ٣-٤ مخطط التقنيتين

```mermaid
flowchart LR
    classDef primary fill:#0B2533,stroke:#22D3EE,stroke-width:2px,color:#CFFAFE
    classDef ai fill:#21153A,stroke:#A78BFA,stroke-width:2px,color:#EDE9FE
    classDef storage fill:#0B2927,stroke:#2DD4BF,stroke-width:2px,color:#CCFBF1
    classDef external fill:#30230B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7
    classDef neutral fill:#161B22,stroke:#64748B,stroke-width:2px,color:#E2E8F0
    classDef error fill:#32151B,stroke:#FB7185,stroke-width:2px,color:#FFE4E6

    subgraph NE["NE555 · bipolar astable"]
        N1["RC charge/discharge<br/>⅓·VCC ↔ ⅔·VCC comparators"]:::neutral
        N2["10 mA supply · 200 mA drive"]:::primary
        N3["50 µs edge accuracy"]:::external
        N4["poor noise immunity<br/>+ debounce needed"]:::error
    end
    subgraph TL["К561ТЛ1 · CMOS Schmitt trigger"]
        T1["RC + hysteresis window<br/>rail-defined threshold"]:::neutral
        T2["0.4 µA supply · 3.4 mA drive"]:::primary
        T3["5 µs edge accuracy"]:::external
        T4["excellent noise immunity<br/>no debounce"]:::external
    end

    N1 --> N2 --> N3 --> N4
    T1 --> T2 --> T3 --> T4

    linkStyle default stroke:#64748B,stroke-width:1.5px
    linkStyle 0,1,2,3,4 stroke:#22D3EE,stroke-width:2px
```

---

## ٤. بنية النظام

يُظهر المستوى الأعلى **المصنع العتادي المُنمذج** على اليسار (ما تمثله المحاكاة: المستشعرات،
و"ADC"، و"RTC"، ونواة الموقّت، و"watchdog"، و"relay"، والمشغّلات، والأضواء) و**طبقة
محاكاة المتصفح** على اليمين (صفحات "HTML" الأربع). العتاد ليس حقيقياً — بل **نموذج
أمين** تمثله كل صفحة من زاوية مختلفة.

```mermaid
flowchart TB
    classDef primary fill:#0B2533,stroke:#22D3EE,stroke-width:2px,color:#CFFAFE
    classDef ai fill:#21153A,stroke:#A78BFA,stroke-width:2px,color:#EDE9FE
    classDef storage fill:#0B2927,stroke:#2DD4BF,stroke-width:2px,color:#CCFBF1
    classDef external fill:#30230B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7
    classDef neutral fill:#161B22,stroke:#64748B,stroke-width:2px,color:#E2E8F0
    classDef error fill:#32151B,stroke:#FB7185,stroke-width:2px,color:#FFE4E6

    subgraph HW["Modelled hardware plant"]
        SENS["Field sensors<br/>anemometer · rain · LDR · NTC · air-raid · PIR"]:::external
        ANALOG["MCP3008 · 8-ch ADC · SPI"]:::neutral
        RTC["DS3231 RTC · I²C"]:::neutral
        CORE["Timer core<br/>К561ТЛ1 primary / NE555 backup"]:::primary
        WDT["Watchdog · 30 s timeout"]:::primary
        RL["SPDT failover relay"]:::external
        DRV["ULN2003 output drivers<br/>Q1·Q2·Q3 · 220 Ω"]:::neutral
        LMP["Signal lamps<br/>GPIO17 R · GPIO27 Y · GPIO22 G"]:::external
    end

    subgraph SW["Browser simulation (HTML / CSS / JS · offline)"]
        HUB["index.html · Hub"]:::neutral
        STA["traffic_control_station.html<br/>FSM · watchdog · relay · environment · telemetry"]:::primary
        ANA["analytics.html<br/>stochastic reliability model"]:::ai
        OSC["oscilloscope.html<br/>R/Y/G lanes · CLK · jitter · eye diagram"]:::primary
        PERS["localStorage<br/>language · stationLang"]:::storage
    end

    HUB --> STA
    HUB --> ANA
    HUB --> OSC
    STA --> PERS
    OSC --> PERS

    SENS --> ANALOG
    ANALOG --> CORE
    RTC --> CORE
    CORE --> WDT
    WDT --> RL
    CORE --> DRV
    DRV --> LMP

    STA -. "models & controls" .-> CORE
    ANA -. "estimates reliability of" .-> CORE
    OSC -. "visualizes timing of" .-> CORE

    style HW fill:#0D1117,stroke:#334155,stroke-width:1.5px,color:#E2E8F0
    style SW fill:#0D1117,stroke:#334155,stroke-width:1.5px,color:#E2E8F0

    linkStyle default stroke:#64748B,stroke-width:1.5px
    linkStyle 9,10,11,12 stroke:#22D3EE,stroke-width:2px
```

---

## ٥. آلة الحالات المحدودة لإشارات المرور

### ٥-١ التسلسل الأساسي والتواقيت

ينفّذ المتحكّم الدورة الكلاسيكية ذات الحالات الأربع (60 ثانية اسمياً، مع سرعة محاكاة
قابلة للضبط 5×–20×):

| الحالة | المفتاح ("Key") | أحمر | أصفر | أخضر | المدة الأساسية |
|---|---|---|---|---|---|
| 1 | RED | ● | | | 30 s |
| 2 | RED_YELLOW | ● | ● | | 2 s |
| 3 | GREEN | | | ● | 25 s |
| 4 | YELLOW | | ● | | 3 s |

**المتغير الثابت:** متجه الأضواء **لا يحتوي أبداً على أحمر+أخضر معاً** — والثنائي
الوحيد المسموح هو الوسط الأماني أحمر+أصفر.

### ٥-٢ مخطط الحالات

```mermaid
flowchart LR
    classDef primary fill:#0B2533,stroke:#22D3EE,stroke-width:2px,color:#CFFAFE
    classDef ai fill:#21153A,stroke:#A78BFA,stroke-width:2px,color:#EDE9FE
    classDef storage fill:#0B2927,stroke:#2DD4BF,stroke-width:2px,color:#CCFBF1
    classDef external fill:#30230B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7
    classDef neutral fill:#161B22,stroke:#64748B,stroke-width:2px,color:#E2E8F0
    classDef error fill:#32151B,stroke:#FB7185,stroke-width:2px,color:#FFE4E6

    RED["RED<br/>30 s 👍"]:::primary
    RY["RED + YELLOW<br/>2 s"]:::primary
    GRN["GREEN<br/>25 s"]:::primary
    YEL["YELLOW<br/>3 s"]:::primary

    RED -->|"2 s"| RY
    RY -->|"2 s"| GRN
    GRN -->|"25 s + modulation"| YEL
    YEL -->|"3 s + modulation"| RED
    RED -->|"cycle complete → cycles++"| RED

    subgraph EM["Special modes (override the cycle)"]
        NIGHT["NIGHT · flashing yellow<br/>tod = night"]:::external
        AIR["AIR-RAID · flashing red · halt<br/>air = true"]:::error
    end

    RED -. "midnight / dusk entry" .-> NIGHT
    RED -. "alert asserted (GPIO5)" .-> AIR
    NIGHT -->|"day returns"| RED
    AIR -->|"all clear → enter(RED)"| RED

    style EM fill:#0D1117,stroke:#334155,stroke-width:1.5px,color:#E2E8F0

    linkStyle default stroke:#64748B,stroke-width:1.5px
    linkStyle 0,1,2,3 stroke:#22D3EE,stroke-width:2px
```

### ٥-٣ تكييف مدة الطور مع البيئة

تعدّل الدالة الزمنية `durFor(idx)` المدة الأساسية اعتماداً على حالة البيئة:

| الشرط ("Condition") | الطور | الإضافة |
|---|---|---|
| ساعة الذروة ("rush hour": صباح أو مساء) | GREEN | +10 s |
| مطر ("rain") | GREEN | +5 s |
| ثلج ("snow") | GREEN | +8 s |
| ثلج | YELLOW | +2 s |
| ثلج | RED_YELLOW | +1 s |
| برد ("hail") | YELLOW | +2 s |
| موسم الشتاء | YELLOW | +1 s |
| موسم الشتاء | RED_YELLOW | +1 s |
| حدث حركة "PIR" معلّق | GREEN | +5…15 s (5 + rand·10) |

يجعل هذا المتحكّم **متكيفاً مع البيئة**: يعطي حركة المرور المزدحمة أو الممطرة أو
الجليدية زمناً أخضر أطول، ويطيل أطوار التحذير حيث تزداد مسافات التوقف.

### ٥-٤ الحركة ("PIR")

- **حدث الحركة الصحيح** يضبط `motionPending = true`؛ وعند دخول GREEN لاحقاً، تُمدَّد
  الحالة بـ `5 + rand(0..10)` ثوانٍ، ويُمسح العلم (وتؤخذ الحركة في الحسبان مرة واحدة فقط).
- **إطلاق خاطئ** (ضوضاء/رياح) يزيد عداد `falseTriggers` المرتبط بالشريحة المقابلة بدلاً
  من ذلك (انظر "القسمين ٦ و٨").

### ٥-٥ الأوضاع الطارئة

- **الليل** (`tod === "night"`): أصفر وامض بفترة "0.5 s" — إشارة بطلب منخفض لحركة
  المرور في وقت متأخر.
- **الإنذار الجوي** (`air === true`): أحمر وامض مع توقف الحركة؛ تَنبض لافتة المشهد
  ويصبح شريط الحالة تنبيهاً متحركاً. عند رفع الإنذار يعود المتحكم إلى الحالة 0 (RED).

---

## ٦. النظام الفرعي لاستشعار البيئة

توثّق صفحة المحطة ورقة الإدخال/الإخراج (البنود **2.1–2.5**) التي تربط مستشعرات الحقل
المادية بحافلة المتحكم:

| الإشارة | المستشعر | الواجهة | تعيين "Raspberry Pi" |
|---|---|---|---|
| الرياح | مقياس شدة الريح | تماثلي ← MCP3008 CH0 | SPI0 (19/21/23/24) |
| الترسّبات | مستشعر المطر | تماثلي ← MCP3008 CH1 | SPI0 |
| الضوء / وقت اليوم | مقاومة ضوئية "LDR" | تماثلي ← MCP3008 CH2 | SPI0 |
| الموسم / درجة الحرارة | "NTC" ثرمستور | تماثلي ← MCP3008 CH3 | SPI0 |
| الوقت والتاريخ | ساعة "DS3231 RTC" | "I²C" | SDA1/SCL1 (3/5) |
| الإنذار الجوي | جهة اتصال جافة ← عزل ضوئي | إدخال منفصل + "IRQ" | GPIO5 (29) |
| الحركة | "HC-SR501" (BISS0001) | إدخال منفصل + "IRQ" | GPIO23 (16) |
| مخرجات الأضواء | "LED" + "ULN2003" Q1–Q3 | إخراج "GPIO" | GPIO17/27/22 (11/13/15) |
| تكرار النواة | ملف "relay" من نوع "SPDT" + "watchdog" | تحريك الملف | GPIO26 (37) |

### مخطط النظام الفرعي

```mermaid
flowchart LR
    classDef primary fill:#0B2533,stroke:#22D3EE,stroke-width:2px,color:#CFFAFE
    classDef ai fill:#21153A,stroke:#A78BFA,stroke-width:2px,color:#EDE9FE
    classDef storage fill:#0B2927,stroke:#2DD4BF,stroke-width:2px,color:#CCFBF1
    classDef external fill:#30230B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7
    classDef neutral fill:#161B22,stroke:#64748B,stroke-width:2px,color:#E2E8F0
    classDef error fill:#32151B,stroke:#FB7185,stroke-width:2px,color:#FFE4E6

    subgraph FIELD["Field sensors"]
        AN["Anemometer<br/>wind 0–5"]:::external
        RN["Rain sensor<br/>none/rain/snow/hail"]:::external
        LDR["LDR<br/>light level"]:::external
        NTC["NTC thermistor<br/>season/temperature"]:::external
        AIR["Air-raid dry contact"]:::error
        PIR["HC-SR501 motion"]:::external
    end

    subgraph IF["Signal interface"]
        ADC["MCP3008<br/>8-ch ADC · SPI0"]:::neutral
        OPTO["Opto-isolator<br/>→ GPIO5 IRQ"]:::neutral
        RTC["DS3231 RTC · I²C"]:::neutral
    end

    subgraph CTRL["Controller & adaptation"]
        CORE["Timer core + RPi GPIO"]:::primary
        ADAPT["durFor(idx) · timing modulation<br/>emergency override"]:::ai
        OUT["ULN2003 + relay · GPIO17/27/22"]:::primary
    end

    AN --> ADC
    RN --> ADC
    LDR --> ADC
    NTC --> ADC
    AIR --> OPTO
    PIR --> CORE
    ADC -->|"SPI"| CORE
    OPTO -->|"GPIO5 IRQ"| CORE
    RTC -->|"I²C"| CORE
    OPTO -->|"AIR override"| ADAPT
    RTC -.-> ADAPT
    CORE --> ADAPT
    ADAPT --> OUT

    style FIELD fill:#0D1117,stroke:#334155,stroke-width:1.5px,color:#E2E8F0
    style IF fill:#0D1117,stroke:#334155,stroke-width:1.5px,color:#E2E8F0
    style CTRL fill:#0D1117,stroke:#334155,stroke-width:1.5px,color:#E2E8F0

    linkStyle default stroke:#64748B,stroke-width:1.5px
```

تُرقمن الإشارات التماثلية عبر "SPI"؛ ويأتي الوقت من "RTC"؛ وخط الإنذار الجوي هو إدخال
"GPIO" معزول ضوئياً بقطع "level-triggered interrupt". يدمج المتحكم كل هذا في أزمنة
الأطوار والأوضاع الطارئة — أي **"ذكاء" النظام التكيفي**.

---

## ٧. تحمّل الأعطال: "watchdog" والتكرار

يعامل المتحكم نواة التوقيت كـ**وحدة قابلة للفشل**: حقن "تجمّد النواة" (زر العطل) يحاكي
تعليقاً، وبعده تختفي نبضة القلب ("heartbeat"). يستنزف "watchdog" من 30 ثانية إلى 0،
وعند الصفر يقوم **بتحويل "relay" تلقائياً من نوع "SPDT" إلى "NE555" الاحتياطي**
ويواصل الدورة.

في **الوضع اليدوي** يجب على المشغّل الضغط على "♥ إعادة ضبط watchdog" لإعادة تسليح
الموقّت قبل استنزافه. في **الوضع التلقائي** يعيد السيكونسر "sequencer" إضافة الطعام
للـ"watchdog" عند كل دخول طور.

```mermaid
flowchart TD
    classDef primary fill:#0B2533,stroke:#22D3EE,stroke-width:2px,color:#CFFAFE
    classDef ai fill:#21153A,stroke:#A78BFA,stroke-width:2px,color:#EDE9FE
    classDef storage fill:#0B2927,stroke:#2DD4BF,stroke-width:2px,color:#CCFBF1
    classDef external fill:#30230B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7
    classDef neutral fill:#161B22,stroke:#64748B,stroke-width:2px,color:#E2E8F0
    classDef error fill:#32151B,stroke:#FB7185,stroke-width:2px,color:#FFE4E6

    PWR["Power on · 5V rail up"]:::external
    RUN["Sequencer running<br/>phases advance"]:::primary
    HBEAT["enter(phase) → pet watchdog<br/>WDT := 30 s"]:::primary
    TICK["tick · sim time advances<br/>WDT -= dt while faulted"]:::neutral
    DRAIN{"WDT ≤ 0 ?"}:::ai
    FAIL["FAILOVER<br/>relay → backup NE555<br/>failovers++ per active chip"]:::error
    BACK["Status: ON BACKUP<br/>telemetry updated"]:::error
    RESET["Reset / heartbeats restored<br/>relay → primary core"]:::primary

    PWR --> RUN
    RUN --> HBEAT
    HBEAT --> TICK
    TICK --> DRAIN
    DRAIN -->|"yes · no heartbeat"| FAIL
    FAIL --> BACK
    BACK -->|"manual reset or heartbeats"| RESET
    RESET --> RUN

    linkStyle default stroke:#64748B,stroke-width:1.5px
    linkStyle 4 stroke:#FB7185,stroke-width:2px
```

المنطق الأساسي في التصميم: زوج "watchdog" + طوارئ سلبية هو الوسيلة المحددة الأدنى
والقاطعة لإبقاء متحكّم سلامة حياً — فالحتياط لا يحتاج إشرافاً مستمراً لأن فشل نبضة
قلب الأساسي نفسه هو ما يفعّله. تتيح المنضدة للمشغّل **ملاحظة هذا السيناريو بالضبط**
ومشاهدة تفاعل التليمترية معه (الحالة المعطوبة، الاستنزاف، التبديل، عدادات الشرائح).

---

## ٨. نموذج الموثوقية العشوائي

تشغّل صفحة `analytics.html` محاكاة بأسلوب "Monte-Carlo" عبر أفق زمني قابل للضبط
(24 ساعة، 168 ساعة، 720 ساعة، 8760 ساعة) وتحت ثلاثة ظروف (اعتدال / قسوة / قصوى).
تُنتج لكلتا الشريحتين "MTBF"، والإطلاقات الخاطئة، والإيجابيات الكاذبة للـ"WDT"،
والتبديلات الاحتياطية، والطاقة، والدقة — انطلاقاً من معاملات الشرائح في النموذج
الداخلي `CHIP` ("من ملف config.yaml" كما تنص الحاشية في الصفحة).

### ٨-١ معاملات الدخل

```
CHIP.NE555   { cur_uA: 10000, acc_us: 50, ftRate: 0.02, wdFp: 0.05 }   /* amber */
CHIP.K561TL1 { cur_uA: 0.4,   acc_us: 5,  ftRate: 0.0,  wdFp: 0.0 }    /* teal  */

COND.mild    { m: 0.5,  events: 24  }   /* أحداث لكل يوم، ومعامل إجهاد m */
COND.harsh   { m: 1.0,  events: 60  }
COND.extreme { m: 2.2,  events: 120 }
```

يُعيّن الأفق إلى `steps` خطوة (قابلة للتكيف بين 24 و120).

### ٨-٢ صيغ النموذج (كما نُفِّذت)

```
events    = (cond.events / 24) · stepDuration                     # أحداث ضوضاء/حركة محيطة
ftHere    = events · ftRate · cond.m · (0.7 + 0.6 · rand())      # إطلاقات خاطئة لهذه الشريحة
ftCum    += ftHere                                               # إطلاقات خاطئة تراكمية

checks    = stepDuration · 3600 / 0.5                            # فحوصات watchdog كل 0.5 ثانية
fp        = checks · (wdFp / 100) · cond.m · 0.02                # احتمال الإيجابية الكاذبة للـ WDT
falsePos += round(fp) if rand() < fp

hangs     = max(0, round(hours/2000 + rand()·1.5))               # تعليقات حقيقية للنواة
failures  = hangs
failovers = hangs + falsePos                                     # التبديل يحتاج حدثاً مثيراً

mtbf      = failovers > 0 ? hours / failovers : hours            # ساعة
energyWh  = cur_uA · 1e-6 · 5.0 · hours                          # I(A) · V(5 V) · t(h)
```

ملاحظات تفسيرية:

- **الإطلاقات الخاطئة** تتناسب مع معدل الأحداث ومعامل الإجهاد `m`، ويتضخم أثرها بمعدل
  الشريحة ضعيفة التحمّل `ftRate` (0.02 مقابل 0.0) — حيث تتراكم "NE555".
- **إيجابيات "WDT" الكاذبة** (تبديلات احتياطية عشوائية سبّبها اضطراب الضوضاء في الـ"watchdog")
  تكون غير صفرية فقط للشريحة "bipolar".
- **التعليقات الحقيقية** متساوية للشريحتين (معدل فشل عتاد المتحكم وليس خلية
  التوقيت)؛ وهذا يعزل مساهمة الشريحة نفسها.
- **"MTBF"** هي الأفق ÷ عدد التبديلات — وهي مؤشر أداء رئيسي مهيمن على الموثوقية.
- **الطاقة** تُشتق من التيار الساكن عند جهد "5 V" → تصبح ميزة "CMOS" (~25,000× أقل)
  رقماً حاسماً في المدى البعيد لأنظمة البطارية أو الطاقة الشمسية.

### ٨-٣ مخطط النموذج

```mermaid
flowchart LR
    classDef primary fill:#0B2533,stroke:#22D3EE,stroke-width:2px,color:#CFFAFE
    classDef ai fill:#21153A,stroke:#A78BFA,stroke-width:2px,color:#EDE9FE
    classDef storage fill:#0B2927,stroke:#2DD4BF,stroke-width:2px,color:#CCFBF1
    classDef external fill:#30230B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7
    classDef neutral fill:#161B22,stroke:#64748B,stroke-width:2px,color:#E2E8F0
    classDef error fill:#32151B,stroke:#FB7185,stroke-width:2px,color:#FFE4E6

    DUR["Duration select<br/>24 / 168 / 720 / 8760 h"]:::external
    COND["Condition<br/>mild / harsh / extreme"]:::external
    PAR["CHIP parameters<br/>cur · acc · ftRate · wdFp"]:::storage
    EVENTS["Ambient events per step<br/>noise & motion"]:::neutral
    FT["Cumulative false triggers"]:::ai
    WDTFP["WDT false positives"]:::ai
    HANG["Genuine hangs"]:::ai
    FAIL["Failovers = hangs + falsePos"]:::error
    MTBF["MTBF = hours / failovers"]:::ai
    ENRG["Energy = I·5 V·t"]:::ai
    RENDER["Charts + KPI cards + summary table<br/>NE555 vs К561ТЛ1"]:::primary

    DUR --> EVENTS
    COND --> EVENTS
    PAR --> FT
    PAR --> WDTFP
    EVENTS --> FT
    FT --> FAIL
    WDTFP --> FAIL
    HANG --> FAIL
    FAIL --> MTBF
    PAR --> ENRG
    MTBF --> RENDER
    ENRG --> RENDER
    FT --> RENDER

    linkStyle default stroke:#64748B,stroke-width:1.5px
    linkStyle 6,7 stroke:#FB7185,stroke-width:2px
```

### ٨-٤ دعم القرار

يعدّ الملخص المعروض عدد المقاييس البالغة سبعة التي تفوز بها كل شريحة ويُصدر توصية:
**يُوصى بـ"К561ТЛ1" كالنواة الأساسية** (يفوز بالتيار والدقة والإطلاقات الخاطئة
وإيجابيات "WDT" الكاذبة و"MTBF" والطاقة)، بينما **تبقى "NE555" كاحتياط** لقدرتها
العالية على الإخراج.

> إخلاء مسؤولية مدمج في الصفحة: "هذه محاكاة وليست قياسات على عتاد حقيقي".

---

## ٩. سلامة الإشارة: الساعة والأطوار والانحراف ("jitter")

يعرض `oscilloscope.html` أربع مسارات حية — **R** و**Y** و**G** وساعة الموقّت **CLK**
(ساعة "2 Hz" بفترة "0.5 s") — إضافة إلى **مخطط عين** مكبّر لحافة الساعة. نقطته
التعليمية كلها في جعل فارق الانحراف العشري (50 µs مقابل 5 µs) **مرئياً**.

### ٩-١ نموذج توليد الإشارة

- تعرض **عملية الطور** `phaseAt(tau)` زمن المحاكاة على دورة الـ"60 s" وتعيد الحالة
  النشطة، فتقود المسارات الرقمية R/Y/G.
- أما **عملية الساعة** `clkAt(tau)` فهي موجة مربعة بتعديل طور:

```
phase   = tau / T_period + amp · noise(tau)     # T_period = 0.5 s
noise   = sin(τ·37.1) + sin(τ·71.7) + sin(τ·113.3)   # ضوضاء زائفة حتمية
signal  = 1 if sin(phase·2π) ≥ 0 else 0
amp     = jitAmp: NE555 0.10  |  К561ТЛ1 0.012        # معيَّر للوضوح
```

الضوضاء الزائفة المكوّنة من ثلاث موجات جيبية **حتمية بالنسبة لـτ** (لا حالة خفية)،
مما يحافظ على ثباتية الموجة مع بقاء مظهرها "حياً". وتظهر التسمية المقاسة بدقة
المواصفة `±50 µs` / `±5 µs`.

### ٩-٢ الانحراف ("jitter") ومخطط العين

الانحراف هو التشتّت الإحصائي لحافة إشارة حول موضعها المثالي. **مخطط العين** يطابق
40 حافة صاعدة، كلُّها مُزاحة عشوائياً ضمن نطاق الانحراف؛ وعرض "الضباب" عند زاوية
العين هو ذروة الانحراف إلى ذروته. والعين المفتوحة جيداً هي العلامة الكلاسيكية على
موقّت/جهاز إرسال موثوق؛ "NE555" تُجمّل الحافة بوضوح مقارنةً بعين "К561ТЛ1" الضيقة.

```mermaid
flowchart LR
    classDef primary fill:#0B2533,stroke:#22D3EE,stroke-width:2px,color:#CFFAFE
    classDef ai fill:#21153A,stroke:#A78BFA,stroke-width:2px,color:#EDE9FE
    classDef storage fill:#0B2927,stroke:#2DD4BF,stroke-width:2px,color:#CCFBF1
    classDef external fill:#30230B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7
    classDef neutral fill:#161B22,stroke:#64748B,stroke-width:2px,color:#E2E8F0
    classDef error fill:#32151B,stroke:#FB7185,stroke-width:2px,color:#FFE4E6

    PHASE["phaseAt(tau)<br/>60 s FSM cycle"]:::primary
    CLK["clkAt(tau)<br/>2 Hz phase-modulated square"]:::primary
    NOISE["noise(tau)<br/>Σ sin(τ·37.1 / 71.7 / 113.3)"]:::ai
    AMP["jitAmp<br/>NE555 0.10 · К561ТЛ1 0.012"]:::storage
    LANES["Scope lanes<br/>R · Y · G · CLK"]:::primary
    MEAS["Measurements<br/>freq · period · duty · phase"]:::neutral
    EYE["Eye diagram<br/>40 sweeps · ± jitter band"]:::external

    PHASE --> LANES
    CLK --> LANES
    NOISE --> CLK
    AMP --> CLK
    AMP --> EYE
    LANES --> MEAS
    CLK --> EYE

    linkStyle default stroke:#64748B,stroke-width:1.5px
    linkStyle 0,1 stroke:#22D3EE,stroke-width:2px
```

### ٩-٣ ما يجب أن يلاحظه الطالب

1. تبديل محدد الشريحة يغيّر فقط **مسار CLK** و**عرض نطاق العين** — فتواقيت الأطوار
   متطابقة.
2. حواف "NE555" "تتعرج" بوضوح؛ وحواف "К561ТЛ1" تبدو نظيفة.
3. يكمّلها لوح القياسات: `±50 µs (high)` مقابل `±5 µs (excellent)`.

---

## ١٠. الاستنتاجات

1. **الصفقة التقنية** — يحتاج متحكّم إشارات تراعي السلامة إلى نواة توقيت *دقيقة*
   *ومستقرة تحت الضوضاء* *وقليلة الاستهلاك*؛ ولهذا الأبعاد الثلاثة تسيطر نواة "CMOS
   Schmitt trigger" "К561ТЛ1" على "NE555" من نوع "bipolar" (وحدها قدرة الإخراج
   تصبّ في صالح "555").
2. **التكرار يعمل** — "watchdog" + "relay" التبديل الاحتياطي يبقيان التقاطع في حالة
   دوران عند تعثر النواة الأساسية؛ ومسار حقن العطل في المنضدة يوضح من البداية إلى
   النهاية الاكتشاف والاستنزاف والتسليم وتقرير الحالة.
3. **تكيّف البيئة** — ربط الطقس/الوقت بأزمنة الأطوار هو طبقة "ذكاء" واقعية منخفضة
   التكلفة (لا حاجة إلى "ML") وتمثّل عرضاً جميلاً للتكيّف الحتمي.
4. **النماذج شفافة** — كل رقم في صفحة التحليلات يتبع صيغة عشوائية صريحة، مما يجعل
   المحاكاة قابلة للتصحيح، وشبيهة بإعادة الإنتاج، وأداة تعليمية نظيفة لهندسة
   الاحتمالات/الموثوقية.

---

## ١١. المسرد ("Glossary")

| المصطلح | المعنى |
|---|---|
| Astable | مذبذب حر الدوران؛ لا حالة سكون مستقرة |
| Bipolar | أسرة منطق/موقّتات قائمة على الترانزستورات (هنا "555" الكلاسيكية) |
| CMOS | أسرة منطق من أشباه الموصلات التكميلية "complementary metal–oxide–semiconductor" |
| Schmitt trigger | مقارن ذو عتبتين ("hysteresis")، محصّن ضد الحواف البطيئة/المزعجة |
| جitter | انحراف عشوائي زمني لحافة إشارة عن موضعها المثالي |
| Eye diagram | حواف إشارة مكدّسة تُستخدم لتقييم هامش الزمن/الضوضاء |
| FSM | آلة الحالات المحدودة — هنا سيكونسر أطوار إشارات المرور |
| Watchdog (WDT) | مؤقّت عتادي/برمجي يجب إعادة ضبطه دورياً ("إطعامه") |
| Failover | تحويل تلقائي إلى وحدة طوارئ بعد عطل |
| MTBF | متوسط الزمن بين الأعطال |
| ULN2003 | صفيفة "Darlington" لقيادة الـ"relay" وأحمال الأضواء |
| MCP3008 | محوّل تماثلي-رقمي "ADC" بثماني قنوات و10 بت عبر "SPI" |
| DS3231 | ساعة زمن حقيقي "RTC" بواجهة "I²C" ومذبذب معوَّض الحرارة |
| HC-SR501 / BISS0001 | وحدة مستشعر حركة "PIR" |
| LDR / NTC | مقاومة ضوئية / ثرمستور بمعامل حرارة سالب |
| Opto-isolator | مرحلة إدخال رقمية عازلة كهربائياً |

---

## ١٢. الملحق: جدول المعاملات

### الدورة الأساسية ("FSM"، اسمياً بلا تكييف)

```
RED  30 s → RED_YELLOW 2 s → GREEN 25 s → YELLOW 3 s → (cycle = 60 s)
```

### ثوابت "watchdog"

```
WDT_TIMEOUT = 30 s        # زمن التسليح بعد كل إطعام
remaining   = durFor(idx) # عداد تنازلي لكل طور (التقدّم عند ≤ 0)
```

### جدول مواصفات الشرائح (مصدر كل الأرقام المشتقة)

| الشريحة | cur | acc | الضوضاء | debounce | ftRate | wdFp | العبوة |
|---|---|---|---|---|---|---|---|
| NE555 | 10000 µA | 50 µs | ضعيفة | مطلوب | 0.02 | 0.05 % | DIP-8 |
| К561ТЛ1 | 0.4 µA | 5 µs | ممتازة | غير مطلوب | 0.0 | 0.0 % | DIP-14 |

### تواقيت "oscilloscope"

```
clkPeriod = 0.5 s  →  f = 2 Hz, duty 50 %
أساسات زمنية:  2 s / 4 s / 8 s
سرعات الأطوار:  1× / 3× / 6×
مسحات العين:  40
```