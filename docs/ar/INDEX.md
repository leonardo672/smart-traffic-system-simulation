# نظام المرور الذكي — فهرس التوثيق

> نقطة الدخول إلى توثيق المشروع.

---

## لمحة عن المشروع

**Smart Traffic** هو نظام بحثي وتعليمي يعمل دون اتصال بالإنترنت، وثنائي اللغة (`RU/EN`)، يعمل كمنصة اختبار تقارن بين تقنيتين للمؤقتات — **NE555** (`bipolar`) و**К561ТЛ1** (`CMOS Schmitt-trigger`) — باعتبارهما نواة التوقيت لوحدة تحكم في إشارات المرور ذات التكرار الاحتياطي للسلامة (`safety-redundant traffic-light controller`).

يتضمن النظام: تسلسل أطوار آلة الحالات المحدودة (`FSM phase sequencing`)، ومراقبًا (`watchdog`) مع مرحل تحويل احتياطي (`failover relay`)، وتوقيتًا متكيفًا مع البيئة (`environment-adaptive timing`)، ونموذجًا احتماليًا للموثوقية (`stochastic reliability model`)، وراسم ذبذبات حيًا (`live oscilloscope`) مع تحليل التذبذب الزمني (`jitter analysis`).

وكل ذلك موجود في أربعة ملفات HTML مستقلة، مع اعتماديات صفرية (`zero dependencies`) ودون الحاجة إلى خادم (`no server`).

---

## ملفات التوثيق

| **الملف**                                                                                        | **الغرض**                           | **اقرأه لتتعلم**                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`SCIENCE_GUIDE.md`](file:///C:/D/Projects-P/smart_traffic_system/docs/SCIENCE_GUIDE.md)         | تعمق علمي شامل مع مخططات            | ما الذي يحاكيه النظام، وإلكترونيات كلتا الدائرتين، و`FSM`، و`watchdog/failover`، ومنظومة الاستشعار، وحسابات الموثوقية، و`jitter` ومخططات العين (`eye diagrams`)، والمسرد (`glossary`)، والملحق الكامل للمعاملات                                                      |
| [`ENGINEERING_USAGE.md`](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md) | تعمق في الاستخدام والهندسة والبرمجة | لماذا المشروع مفيد (تعليميًا / للسلامة / للأنظمة المضمنة)، وبنية الكود، ونمط كائن الحالة (`state-object pattern`)، ومحرك `canvas`، والمخططات التخطيطية `SVG`، والتدويل (`i18n`)، وتصميم المحاكاة، ومحرك التحليلات (`analytics engine`)، والقيود، وخارطة طريق التوسعة |

```mermaid
image
```

`docs/ · INDEX.md · SCIENCE_GUIDE.md — الشروحات والمخططات العلمية · ENGINEERING_USAGE.md — دليل الاستخدام والبرمجة · actual source — صفحات HTML الأربع`

---

## كيفية قراءة هذا التوثيق

1. **ابدأ بالدليل العلمي** (`science guide`) للحصول على فهم كامل لـ*ما هو* النظام و*لماذا* يتصرف بالطريقة التي يتصرف بها — إذ يتم شرح كل طور، ومؤقت، ومستشعر، ومعادلة، وتمثيلها في مخططات. ويُعد **[Appendix: parameter reference]** المصدر المرجعي الوحيد للأرقام الأساسية.

2. **ثم اقرأ دليل الهندسة والاستخدام** (`engineering & usage guide`) لفهم *كيفية* تنفيذ النظام و*كيفية استخدامه / توسيعه* — بما في ذلك بنية الكود، وآلية التصيير (`rendering`)، والتدويل (`i18n`)، ومحرك التحليلات (`analytics engine`)، والقيود.

3. **افتح التطبيق نفسه**:
   `index.html` → `traffic_control_station.html` (تشغيل الطاقة، والتبديل بين الشرائح، وحقن الأعطال، وتجربة وضع الغارة الجوية / الليل) → `analytics.html` (تشغيل اختبار إجهاد) → `oscilloscope.html` (التبديل بين الشرائح ومراقبة `jitter`).

---

## خريطة الصفحة ↔ التوثيق

| **الصفحة**                     | **قسم الدليل العلمي**                                                                                                                                                                                                                                                                                                                                                | **قسم الدليل الهندسي**                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                   | [§4 System architecture](file:///C:/D/Projects-P/smart_traffic_system/docs/SCIENCE_GUIDE.md#4-system-architecture)                                                                                                                                                                                                                                                   | [§3 Layout & stack](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md#3-repository-layout-and-tech-stack)                                                                                                                                                                                                                                                                      |
| `traffic_control_station.html` | [§5 FSM](file:///C:/D/Projects-P/smart_traffic_system/docs/SCIENCE_GUIDE.md#5-the-traffic-light-finite-state-machine)، [§6 Sensing](file:///C:/D/Projects-P/smart_traffic_system/docs/SCIENCE_GUIDE.md#6-environment-sensing-subsystem)، [§7 Watchdog](file:///C:/D/Projects-P/smart_traffic_system/docs/SCIENCE_GUIDE.md#7-fault-tolerance-watchdog-and-redundancy) | [§5 State object](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md#5-the-state-object-pattern-heart-of-the-app)، [§6 Rendering](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md#6-rendering-pipeline)، [§7–10 Canvas/SVG/i18n/sim](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md#7-canvas-engine-oscilloscope--weather-scene) |
| `analytics.html`               | [§8 Reliability model](file:///C:/D/Projects-P/smart_traffic_system/docs/SCIENCE_GUIDE.md#8-the-stochastic-reliability-model)                                                                                                                                                                                                                                        | [§11 Analytics engine](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md#11-the-analytics-engine)                                                                                                                                                                                                                                                                              |
| `oscilloscope.html`            | [§9 Signal integrity](file:///C:/D/Projects-P/smart_traffic_system/docs/SCIENCE_GUIDE.md#9-signal-integrity-clock-phases-and-jitter)                                                                                                                                                                                                                                 | [§7 Canvas engine](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md#7-canvas-engine-oscilloscope--weather-scene)، [§10 Simulation](file:///C:/D/Projects-P/smart_traffic_system/docs/ENGINEERING_USAGE.md#10-simulation-design)                                                                                                                                               |

---

## حقائق سريعة

* **دورة المرور الاسمية** (`Nominal traffic cycle`): ‏60 ثانية — أحمر (`RED`) 30 ثانية → أحمر + أصفر (`R+Y`) ثانيتان → أخضر (`GREEN`) 25 ثانية → أصفر (`YELLOW`) 3 ثوانٍ.
* **مراقب الأعطال** (`Watchdog`): ‏30 ثانية؛ ينخفض عداده عند حدوث عطل؛ وعند الوصول إلى 0 → يتم التحويل إلى `NE555` الاحتياطي (`failover to NE555 backup`).
* **الفارق بين الشرائح** (`Chip gap`): ‏10,000 µA مقابل 0.4 µA (نحو 25,000×)، ودقة 50 µs مقابل 5 µs، ومناعة ضد الضوضاء (`noise immunity`) ضعيفة مقابل ممتازة.
* **الساعة** (`Clock`): ‏2 Hz، بفترة 0.5 ثانية؛ والتذبذب الزمني (`jitter`) ±50 µs في `NE555` مقابل ±5 µs في `К561ТЛ1`.

> تستخدم جميع المخططات في هذه الوثائق نظام ألوان دلاليًا موحدًا للواجهة الداكنة (`semantic dark-theme color system`) — السماوي (`cyan`) = البنية الأساسية (`core architecture`)، والبنفسجي (`violet`) = النماذج / الذكاء (`models/intelligence`)، والفيروزي (`teal`) = الاستمرارية / التخزين (`persistence`)، والكهرماني (`amber`) = العناصر الخارجية (`external`)، والوردي (`rose`) = مسارات الأخطاء (`error paths`)، والرمادي الأردوازي (`slate`) = البنية التحتية (`infra`) — وقد صُمم هذا النظام ليتناسب مع README داكن على GitHub.
