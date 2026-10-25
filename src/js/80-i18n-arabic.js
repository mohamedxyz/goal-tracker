/**
 * English and Arabic.
 * The AR dictionary and PAT patterns drive a MutationObserver that translates the page; also habit ordering and collapsed-section helpers.
 * (All src/js files are joined, in filename order, into one shared scope. See src/README.md.)
 */

/* ---------- Language: English / العربية ---------- */
// The app is written in English. In Arabic mode every piece of text that appears on screen is translated from this dictionary
// as it is added to the page (and restored when you switch back), and the layout flips to right-to-left.
const AYAM = (n) => ((n = +n), n === 1 ? 'يوم' : n === 2 ? 'يومان' : n >= 3 && n <= 10 ? 'أيام' : 'يومًا');
const HZ_AR = { weekly: 'أسبوعية', monthly: 'شهرية', annual: 'سنوية', '5-year': 'خمسية', sub: 'فرعية' },
  HZ1_AR = { weekly: 'أسبوعي', monthly: 'شهري', annual: 'سنوي', '5-year': 'خمسي' };
const WHY_AR = {
  'pushing this back': 'تؤجل هذه المهمة',
  'pushing these back': 'تؤجل هذه المهام',
  'deleting work that is due': 'تحذف عملًا مستحقًا',
};
const AR = {
  'New task… try: tomorrow !high #uni': 'مهمة جديدة… جرّب: غدًا !high #uni',
  '+ New habit': '+ عادة جديدة',
  Advanced: 'خيارات متقدمة',
  Restore: 'استعادة',
  Shields: 'الدروع',
  Morale: 'المعنويات',
  'Rest tokens': 'رموز الراحة',
  'Boss HP': 'نقاط حياة الزعيم',
  Notifications: 'الإشعارات',
  Reminders: 'التذكيرات',
  'Morning plan, evening check-in, classes and exams, as phone notifications':
    'خطة الصباح ومراجعة المساء والحصص والامتحانات كإشعارات على الهاتف',
  'Morning plan at': 'خطة الصباح الساعة',
  'Evening check-in at': 'مراجعة المساء الساعة',
  'Class reminders': 'تذكير الحصص',
  '10 minutes before each class': 'قبل كل حصة بـ10 دقائق',
  'Exam reminders': 'تذكير الامتحانات',
  'The evening before an exam or quiz': 'مساء اليوم السابق للامتحان أو الاختبار',
  'Send a test notification': 'أرسل إشعارًا تجريبيًا',
  'Exact timers': 'مؤقتات دقيقة',
  'Exact timers let the focus timer ring on the second; without them Android may deliver it a little late.':
    'المؤقتات الدقيقة تجعل مؤقت التركيز يرن في وقته تمامًا؛ بدونها قد يتأخر أندرويد قليلًا.',
  'Parent goal': 'الهدف الأعلى',
  'Monthly review': 'المراجعة الشهرية',
  'Day levels': 'مستويات الأيام',
  'Week boss': 'زعيم الأسبوع',
  'Best week': 'أفضل أسبوع',
  "This month's goals": 'أهداف هذا الشهر',
  Guardian: 'الحارس',
  'tasks missed': 'مهام فائتة',
  'tasks done': 'مهام منجزة',
  habits: 'العادات',
  'Previous month': 'الشهر السابق',
  'Next month': 'الشهر التالي',
  'Back up now': 'انسخ احتياطيًا الآن',
  'Restore this backup?': 'استعادة هذه النسخة؟',
  'If this browser clears its storage, everything since your last backup is gone. Back up now.':
    'إذا مسح هذا المتصفح بياناته، يضيع كل شيء منذ آخر نسخة احتياطية. انسخ الآن.',
  'Your data lives only in this browser. Save a backup and keep it somewhere safe.':
    'بياناتك محفوظة في هذا المتصفح فقط. احفظ نسخة احتياطية واحتفظ بها في مكان آمن.',
  'Start from a template': 'ابدأ من قالب',
  'Everything it adds is yours to rename or delete. Or try the app with sample data first:':
    'كل ما يضيفه لك لتعيد تسميته أو تحذفه. أو جرّب التطبيق ببيانات تجريبية أولًا:',
  'Load sample data': 'تحميل بيانات تجريبية',
  'Sample data is on': 'البيانات التجريبية مفعّلة',
  'Explore freely. Clearing removes only the sample items, never your own.':
    'استكشف بحرية. المسح يزيل العناصر التجريبية فقط، لا عناصرك.',
  'Clear sample': 'مسح التجريبي',
  'Clear sample data': 'مسح البيانات التجريبية',
  'Templates and sample data': 'القوالب والبيانات التجريبية',
  'Start a goal ladder from a template, or explore the app with sample data you can clear later.':
    'ابدأ سلّم أهداف من قالب، أو استكشف التطبيق ببيانات تجريبية يمكنك مسحها لاحقًا.',
  Templates: 'القوالب',
  'Remove all sample items? Your own items stay.': 'إزالة كل العناصر التجريبية؟ تبقى عناصرك.',
  '🗓 Timetable': '🗓 الجدول',
  'Week starts': 'بداية الأسبوع',
  'No classes yet. Add your weekly classes below.': 'لا حصص بعد. أضف حصصك الأسبوعية أدناه.',
  '+ Add class': '+ أضف حصة',
  Starts: 'تبدأ',
  Ends: 'تنتهي',
  'Room (optional)': 'القاعة (اختياري)',
  'Add class': 'أضف حصة',
  Day: 'اليوم',
  'Class added. Add topics for it below to get study picks.':
    'أُضيفت الحصة. أضف مواضيعها أدناه لتحصل على اقتراحات الدراسة.',
  '🎁 Add a reward': '🎁 أضف مكافأة',
  'Edit reward': 'تعديل المكافأة',
  'Rest tokens': 'رموز الراحة',
  '🛌 Rest day': '🛌 يوم راحة',
  'Rest today': 'استرح اليوم',
  'Rest yesterday': 'استرح أمس',
  'Your reward for beating this boss (leave empty to remove):': 'مكافأتك عند هزيمة هذا الزعيم (اتركها فارغة لإزالتها):',
  '🎁 Enjoy it. You earned it.': '🎁 استمتع بها. لقد استحققتها.',
  '🛌 Rest day set. Streaks are safe.': '🛌 تم تعيين يوم راحة. سلاسلك بأمان.',
  'Plan week': 'خطّط الأسبوع',
  "No weekly goals yet. Pick this week's steps.": 'لا أهداف أسبوعية بعد. اختر خطوات هذا الأسبوع.',
  'No habits yet.': 'لا عادات بعد.',
  'No habits yet. Tap a day to check it off.': 'لا عادات بعد. اضغط يومًا لتعليمه.',
  'No goals yet. Add one above, then hang tasks under it.': 'لا أهداف بعد. أضف هدفًا في الأعلى، ثم علّق المهام تحته.',
  Shields: 'الدروع',
  Morale: 'المعنويات',
  'Knocked out': 'سقطت',
  'Counterattacks blocked': 'هجمات صُدّت',
  Elites: 'النخبة',
  'Log score': 'سجّل الدرجة',
  'Exam elite is defeated at': 'يُهزم وحش الامتحان عند',
  Reopen: 'إعادة فتح',
  'Mark complete': 'تعليم كمكتمل',
  '🏰 Tower': '🏰 البرج',
  'Final boss · your 5-year goal': 'الزعيم الأخير · هدفك لخمس سنوات',
  Guardians: 'الحرّاس',
  'Weekly bosses this month': 'زعماء الأسابيع هذا الشهر',
  'Beat weekly bosses and finish monthly goals to hit the guardian. Guardians and annual goals hit the annual boss.':
    'اهزم زعماء الأسابيع وأنجز الأهداف الشهرية لتضرب الحارس. الحرّاس والأهداف السنوية تضرب زعيم العام.',
  '📅 Calendar': '📅 التقويم',
  '☰ List': '☰ القائمة',
  '🕐 Plan': '🕐 المخطِّط',
  'Start time': 'وقت البدء',
  Length: 'المدة',
  'Add a task on this day…': 'أضف مهمة في هذا اليوم…',
  'Nothing on this day.': 'لا شيء في هذا اليوم.',
  Focus: 'تركيز',
  Break: 'استراحة',
  Pause: 'إيقاف مؤقت',
  Resume: 'استئناف',
  Stop: 'إيقاف',
  'Skip break': 'تخطي الاستراحة',
  'Focus time': 'وقت التركيز',
  'Focus session length': 'مدة جلسة التركيز',
  'Break length': 'مدة الاستراحة',
  'Break over. Ready for another round?': 'انتهت الاستراحة. مستعد لجولة أخرى؟',
  "Stopped. Sessions under 5 minutes aren't logged.": 'توقف. الجلسات الأقل من 5 دقائق لا تُسجّل.',
  'Stop the current focus session and start a new one?': 'إيقاف جلسة التركيز الحالية وبدء جلسة جديدة؟',
  '✅ Build': '✅ بناء',
  '🛡 Avoid': '🛡 تجنّب',
  'activity, charts, habit consistency': 'النشاط، الرسوم، انتظام العادات',
  Decrease: 'إنقاص',
  Increase: 'زيادة',
  'Set exact value': 'تعيين قيمة دقيقة',
  'More actions': 'إجراءات أخرى',
  Collapse: 'طيّ',
  Expand: 'توسيع',
  "This week's step toward it…": 'خطوة هذا الأسبوع نحوه…',
  'No weekly goal': 'بلا هدف أسبوعي',
  'Student mode only: tighter spacing, smaller text, fewer extras, so more fits on a small screen':
    'لوضع الطالب فقط: مسافات أضيق ونص أصغر وإضافات أقل، ليتسع المزيد على الشاشة الصغيرة',
  Coach: 'المدرب',
  'Day levels and coach': 'مستويات اليوم والمدرب',
  On: 'تشغيل',
  Off: 'إيقاف',
  'Blaze starts at': 'يبدأ اللهب عند',
  'Titan starts at': 'يبدأ الجبّار عند',
  '⚡ Spark is a slow start and the coach is gentle. 🔥 Blaze pushes. ⚔️ Titan raises the bar: a daily quota, and you must type a reason to push back, reschedule or delete work that is due. Nothing is ever changed without you.':
    '⚡ الشرارة بداية هادئة والمدرب لطيف. 🔥 اللهب يدفعك. ⚔️ الجبّار يرفع السقف: حصة يومية، وعليك كتابة سبب لتأجيل أو إعادة جدولة أو حذف عمل مستحق. لا يتغير شيء دون موافقتك.',
  Quota: 'الحصة',
  '7-day avg': 'متوسط 7 أيام',
  'Best day': 'أفضل يوم',
  'Day streak': 'سلسلة الأيام',
  'Start a streak': 'ابدأ سلسلة',
  'Habit moved to Trash.': 'نُقلت العادة إلى سلة المحذوفات.',
  'Task moved to Trash.': 'نُقلت المهمة إلى سلة المحذوفات.',
  'Pulled into today.': 'سُحبت إلى اليوم.',
  "Delete this forever? This can't be undone.": 'حذف نهائي؟ لا يمكن التراجع.',
  'Not applied. Titan wants a reason.': 'لم يُطبَّق. الجبّار يريد سببًا.',
  'Not saved. Titan wants a reason.': 'لم يُحفظ. الجبّار يريد سببًا.',
  'Not deleted. Titan wants a reason.': 'لم يُحذف. الجبّار يريد سببًا.',
  '(Leave empty to remove the folder. Its habits are kept.)': '(اتركه فارغًا لإزالة المجلد. تبقى عاداته.)',
  'Replace all current data with this backup?': 'استبدال كل البيانات الحالية بهذه النسخة؟',
  "This can't be undone. Not-completed archived tasks are kept.": 'لا يمكن التراجع. تبقى المهام المؤرشفة غير المكتملة.',
  Week: 'أسبوع',
  Month: 'شهر',
  Year: 'سنة',
  '5 Years': '5 سنوات',
  '5 Yr': '5 سنوات',
  '+ Task': '+ مهمة',
  'New task for this goal': 'مهمة جديدة لهذا الهدف',
  Colour: 'اللون',
  Black: 'أسود',
  'Black (OLED)': 'أسود (OLED)',
  Clay: 'طين',
  Terra: 'تيرا',
  Ocean: 'محيط',
  Grape: 'عنب',
  Rose: 'وردي',
  Graphite: 'غرافيت',
  'Game mode': 'وضع اللعبة',
  'RPG game mode': 'وضع لعبة المغامرة',
  'A weekly pixel boss you beat by finishing tasks, habits and study. Shows damage, a hero level and a bestiary of beaten monsters':
    'زعيم أسبوعي بالبكسل تهزمه بإنجاز المهام والعادات والدراسة. يعرض الضرر ومستوى البطل وسجل الوحوش المهزومة',
  'Week boss': 'زعيم الأسبوع',
  'Last day': 'اليوم الأخير',
  Bestiary: 'سجل الوحوش',
  Hero: 'البطل',
  Defeated: 'هُزم',
  Escaped: 'هرب',
  'Defeated. It joins your bestiary.': 'هُزم. انضم إلى سجل وحوشك.',
  'Clean days': 'أيام نظيفة',
  STR: 'القوة',
  VIT: 'الحيوية',
  INT: 'الذكاء',
  DEF: 'الدفاع',
  'Boss HP': 'صحة الزعيم',
  "No monsters yet. Beat this week's boss to start your collection.":
    'لا وحوش بعد. اهزم زعيم هذا الأسبوع لتبدأ مجموعتك.',
  'the Procrastinator': 'المُسوِّف',
  'the Snoozer': 'النعسان',
  'of Endless Tabs': 'صاحب التبويبات اللانهائية',
  'the Deadline Eater': 'آكل المواعيد',
  'the Doomscroller': 'المُتصفّح بلا نهاية',
  'of Unread Messages': 'صاحب الرسائل غير المقروءة',
  'the Excuse Maker': 'صانع الأعذار',
  'the Distractor': 'المُشتِّت',
  'of Tomorrow': 'سيّد الغد',
  'the Couch Golem': 'غولم الأريكة',
  'the Notification Fiend': 'شيطان الإشعارات',
  'of Half-Done Drafts': 'صاحب المسودات الناقصة',
  'the Overthinker': 'كثير التفكير',
  'the Time Thief': 'سارق الوقت',
  'the Lazy Tide': 'موجة الكسل',
  'of Later': 'سيّد لاحقًا',
  'Tap for your level calendar': 'اضغط لرؤية تقويم مستوياتك',
  'Show intro again': 'عرض المقدمة مرة أخرى',
  'Open level calendar': 'فتح تقويم المستويات',
  'Goal Tracker': 'متتبع الأهداف',
  Dashboard: 'لوحة المتابعة',
  Home: 'الرئيسية',
  Tasks: 'المهام',
  Goals: 'الأهداف',
  Habits: 'العادات',
  Study: 'الدراسة',
  Settings: 'الإعدادات',
  Auto: 'تلقائي',
  Light: 'فاتح',
  Dark: 'داكن',
  Search: 'بحث',
  'Search everything…': 'ابحث في كل شيء…',
  'Type to search tasks, goals and habits.': 'اكتب للبحث في المهام والأهداف والعادات.',
  'Nothing found.': 'لا توجد نتائج.',
  Close: 'إغلاق',
  Cancel: 'إلغاء',
  Save: 'حفظ',
  Add: 'إضافة',
  Edit: 'تعديل',
  Delete: 'حذف',
  Copy: 'نسخ',
  Restore: 'استعادة',
  Undo: 'تراجع',
  'Check off': 'تم',
  Dismiss: 'إخفاء',
  'Theme: auto (tap to change)': 'السمة: تلقائي (اضغط للتغيير)',
  'Theme: light (tap to change)': 'السمة: فاتح (اضغط للتغيير)',
  'Theme: dark (tap to change)': 'السمة: داكن (اضغط للتغيير)',
  Theme: 'السمة',
  // dashboard
  Today: 'اليوم',
  Tomorrow: 'غدًا',
  yesterday: 'أمس',
  Overdue: 'متأخرة',
  "Today's tasks": 'مهام اليوم',
  "Today's habits": 'عادات اليوم',
  "This week's goals": 'أهداف هذا الأسبوع',
  "Today's picks": 'اختيارات اليوم',
  "Today's tasks done": 'مهام اليوم المنجزة',
  'Habits done today': 'العادات المنجزة اليوم',
  'Nothing due today.': 'لا شيء مستحق اليوم.',
  'Staying clean': 'البقاء بعيداً',
  '☑ Select': '☑ تحديد',
  Spark: 'شرارة',
  Blaze: 'لهب',
  Titan: 'جبّار',
  '🪜 Ladder': '🪜 السلّم',
  '+ Add a task for this goal': '+ أضف مهمة لهذا الهدف',
  'Weekly goal': 'هدف أسبوعي',
  'More options': 'خيارات إضافية',
  Insights: 'الإحصائيات',
  '⋯': '⋯',
  '✎ Edit': '✎ تعديل',
  Share: 'مشاركة',
  '✓ Selecting': '✓ جارٍ التحديد',
  All: 'الكل',
  None: 'لا شيء',
  Cancel: 'إلغاء',
  '✓ Done': '✓ تم',
  '✎ Edit…': '✎ تعديل…',
  Archive: 'أرشفة',
  '🗑 Delete': '🗑 حذف',
  Trash: 'سلة المحذوفات',
  'Open trash →': 'فتح السلة ←',
  'Trash is empty.': 'السلة فارغة.',
  'Empty trash': 'إفراغ السلة',
  'Compact layout': 'تخطيط مضغوط',
  Apply: 'تطبيق',
  'Staying clean today': 'بعيد عنها اليوم',
  'Longest clean streak': 'أطول سلسلة امتناع',
  'Clean so far today': 'ملتزم حتى الآن اليوم',
  'Slipped today': 'زلّ اليوم',
  'Held today': 'امتنعت اليوم',
  'Not confirmed yet': 'لم يؤكَّد بعد',
  'Log slip': 'سجّل زلّة',
  'Undo slip': 'تراجع عن الزلّة',
  'Mark avoided': 'تم الامتناع',
  'Plan this week': 'خطّط هذا الأسبوع',
  'Weekly report': 'التقرير الأسبوعي',
  Activity: 'النشاط',
  'Activity heatmap': 'خريطة النشاط',
  Less: 'أقل',
  More: 'أكثر',
  actions: 'إجراءات',
  'active days': 'أيام نشطة',
  'Last 26 weeks': 'آخر 26 أسبوعًا',
  'Last 30 days': 'آخر 30 يومًا',
  'Last 30': 'آخر 30',
  'Total days': 'إجمالي الأيام',
  'Best habit streak': 'أفضل سلسلة حالية',
  'Best streak': 'أفضل سلسلة',
  'Habit consistency': 'انتظام العادات',
  'Tasks completed': 'المهام المنجزة',
  'Goal progress': 'تقدم الأهداف',
  'Active goals': 'الأهداف النشطة',
  'none yet': 'لا شيء بعد',
  Current: 'الحالية',
  'Current periods': 'الفترات الحالية',
  Sections: 'الأقسام',
  Review: 'مراجعة',
  'Hit it, missed, or carry over. About a minute.': 'حققته أو فاتني أو أرحّله. دقيقة تقريبًا.',
  'These periods have ended. Be honest. This is where the system gets smarter.':
    'انتهت هذه الفترات. كن صادقًا، هنا يصبح النظام أذكى.',
  'All caught up. Reviews done ✓': 'لا شيء متأخر. اكتملت المراجعات ✓',
  '✓ Hit it': '✓ حققته',
  '✗ Missed': '✗ فاتني',
  'Hit it': 'حققته',
  Missed: 'فاتني',
  'Review note (what got in the way / what worked)': 'ملاحظة المراجعة (ما الذي أعاق / ما الذي نجح)',
  'What got in the way / what worked? (optional)': 'ما الذي أعاق / ما الذي نجح؟ (اختياري)',
  'No backup yet': 'لا توجد نسخة احتياطية بعد',
  'Your data lives only in this browser. Copy a backup and keep it somewhere safe.':
    'بياناتك محفوظة في هذا المتصفح فقط. انسخ نسخة احتياطية واحتفظ بها في مكان آمن.',
  'Copy backup': 'نسخ احتياطي',
  'Remind me later': 'ذكّرني لاحقًا',
  'Dismiss backup reminder': 'إخفاء تذكير النسخ الاحتياطي',
  'OK →': 'حسنًا →',
  // tasks
  'New task…': 'مهمة جديدة…',
  'Notes (optional)': 'ملاحظات (اختياري)',
  Notes: 'ملاحظات',
  Checklist: 'قائمة تحقق',
  'Checklist (optional, one item per line)': 'قائمة تحقق (اختياري، عنصر في كل سطر)',
  'Checklist (one item per line)': 'قائمة تحقق (عنصر في كل سطر)',
  'Item one Item two': 'عنصر أول عنصر ثانٍ',
  'Tag folder': 'مجلد الوسم',
  'Tag folder (optional)': 'مجلد الوسم (اختياري)',
  'None. Type a name to create one': 'لا شيء. اكتب اسمًا لإنشاء مجلد',
  Title: 'العنوان',
  'Due date': 'تاريخ الاستحقاق',
  Due: 'الاستحقاق',
  Priority: 'الأولوية',
  Low: 'منخفضة',
  Medium: 'متوسطة',
  High: 'عالية',
  'High priority': 'أولوية عالية',
  'Medium priority': 'أولوية متوسطة',
  'Linked goal': 'الهدف المرتبط',
  '— No goal —': '— بدون هدف —',
  Repeat: 'التكرار',
  Repeats: 'يتكرر',
  'No repeat': 'بلا تكرار',
  Daily: 'يوميًا',
  Weekdays: 'أيام الأسبوع',
  Weekly: 'أسبوعيًا',
  Monthly: 'شهريًا',
  Annual: 'سنويًا',
  '5-Year': '5 سنوات',
  '🔁 Daily': '🔁 يوميًا',
  '🔁 Weekdays': '🔁 أيام العمل',
  '🔁 Weekly': '🔁 أسبوعيًا',
  '🔁 Monthly': '🔁 شهريًا',
  'Details, links, anything…': 'تفاصيل، روابط، أي شيء…',
  Completed: 'مكتملة',
  'Mark complete': 'تحديد كمكتملة',
  Complete: 'إكمال',
  All: 'الكل',
  'Due today': 'مستحقة اليوم',
  Done: 'منجزة',
  Archive: 'أرشفة',
  Archived: 'مؤرشفة',
  'Edit task': 'تعديل المهمة',
  'Edit goal': 'تعديل الهدف',
  'Edit habit': 'تعديل العادة',
  'Edit topic': 'تعديل الموضوع',
  'Edit exam': 'تعديل الاختبار',
  'Edit quiz': 'تعديل الاختبار القصير',
  'No tasks here.': 'لا مهام هنا.',
  'Missed tasks': 'المهام الفائتة',
  'Restore to tasks': 'استعادة إلى المهام',
  'Archived tasks': 'المهام المؤرشفة',
  'Nothing archived yet. Use the archive button on a task to move it here.':
    'لا شيء مؤرشف بعد. استخدم زر الأرشفة في المهمة لنقلها إلى هنا.',
  'View archived tasks →': 'عرض المهام المؤرشفة →',
  '← Settings': '← الإعدادات',
  Created: 'أُنشئت',
  Status: 'الحالة',
  'Not completed': 'غير مكتملة',
  // goals
  'New weekly goal…': 'هدف أسبوعي جديد…',
  'Add goal': 'إضافة هدف',
  'All periods': 'كل الفترات',
  Horizon: 'المدى',
  Period: 'الفترة',
  'How will you measure it?': 'كيف ستقيس تقدمه؟',
  "How it's measured": 'طريقة القياس',
  '☐ Checkbox': '☐ مربع اختيار',
  '☐ Checkbox (or all linked tasks done)': '☐ مربع اختيار (أو إنجاز كل المهام المرتبطة)',
  '🔢 Number': '🔢 رقم',
  '🔢 Number target': '🔢 هدف رقمي',
  '🧩 Built from sub-goals': '🧩 مبني من أهداف فرعية',
  Target: 'الهدف',
  Unit: 'الوحدة',
  'Current value': 'القيمة الحالية',
  'Target, e.g. 10': 'الهدف، مثال: 10',
  'Target, e.g. 40': 'الهدف، مثال: 40',
  'Unit, e.g. hours': 'الوحدة، مثال: ساعات',
  'hours, pages…': 'ساعات، صفحات…',
  'Sub-goals needed to complete it': 'عدد الأهداف الفرعية اللازمة لإكماله',
  "Why it matters / how you'll measure it (optional)": 'لماذا يهم / كيف ستقيسه (اختياري)',
  '— None —': '— لا شيء —',
  '— Supports which monthly goal? —': '— أي هدف شهري يدعم؟ —',
  'Supports which monthly goal?': 'أي هدف شهري يدعم؟',
  'Supports which annual goal?': 'أي هدف سنوي يدعم؟',
  'Standalone weekly goals': 'أهداف أسبوعية مستقلة',
  'A weekly goal of its own…': 'هدف أسبوعي خاص به…',
  Active: 'نشط',
  'Weekly goals': 'الأهداف الأسبوعية',
  'Goals finished': 'الأهداف المنجزة',
  Goal: 'الهدف',
  Carry: 'ترحيل',
  Plan: 'تخطيط',
  'Previous week': 'الأسبوع السابق',
  'Next week': 'الأسبوع التالي',
  'Previous month': 'الشهر السابق',
  'Next month': 'الشهر التالي',
  'This week': 'هذا الأسبوع',
  'Last week': 'الأسبوع الماضي',
  'No monthly goals built from weekly goals for 2026-10 yet. Add standalone goals below, or create a monthly goal on the Goals tab first.':
    'لا توجد أهداف شهرية مبنية من أهداف أسبوعية بعد. أضف أهدافًا مستقلة بالأسفل أو أنشئ هدفًا شهريًا من تبويب الأهداف أولًا.',
  // habits
  'New habit (e.g. Code 1 hour, or No smoking)…': 'عادة جديدة (مثال: برمجة ساعة، أو عدم التدخين)…',
  'Add habit': 'إضافة عادة',
  'Habit type': 'نوع العادة',
  '✅ Build: tick it when done': '✅ بناء: علّمها عند الإنجاز',
  '🚫 Avoid: clean unless you slip': '🚫 تجنّب: نظيف ما لم تنزلق',
  '🚫 Avoid: tick each clean day': '🚫 تجنّب: علّم كل يوم نظيف',
  'Target days per week': 'أيام الهدف في الأسبوع',
  Folder: 'المجلد',
  'Folder (optional), e.g. Morning routine': 'مجلد (اختياري)، مثال: روتين الصباح',
  'Rename folder': 'إعادة تسمية المجلد',
  Schedule: 'الجدول',
  Days: 'الأيام',
  "Days it's due (none = every day)": 'الأيام المطلوبة (لا شيء = كل يوم)',
  'none = every day': 'لا شيء = كل يوم',
  'Hide done today': 'إخفاء المنجز اليوم',
  '✓ Hiding done today': '✓ المنجز اليوم مخفي',
  Compact: 'مضغوط',
  '✓ Compact': '✓ مضغوط',
  '↕ Reorder': '↕ ترتيب',
  '✓ Reordering': '✓ جارٍ الترتيب',
  'Move up': 'تحريك لأعلى',
  'Move down': 'تحريك لأسفل',
  'Open history': 'فتح السجل',
  Name: 'الاسم',
  Type: 'النوع',
  'tick ✓ when done': 'علّم ✓ عند الإنجاز',
  'Tap any past day to check it off or undo it.': 'اضغط أي يوم سابق لتعليمه أو التراجع عنه.',
  'All habits done for today 🎉': 'اكتملت كل عادات اليوم 🎉',
  'Off today': 'إجازة اليوم',
  'All done': 'اكتمل كل شيء',
  // study
  'Study today': 'الدراسة اليوم',
  '📚 Study today': '📚 دراسة اليوم',
  'Open Study →': 'فتح الدراسة →',
  'Add your subjects and topics to start your revision timetable.': 'أضف موادك ومواضيعك لتبدأ جدول المراجعة.',
  Subject: 'المادة',
  'Subject (e.g. Biochemistry)': 'المادة (مثال: الكيمياء الحيوية)',
  Topic: 'الموضوع',
  'Topics, one per line': 'المواضيع، موضوع في كل سطر',
  'Add topics': 'إضافة مواضيع',
  'Weak and untouched topics come first. Tap a day to log it.':
    'المواضيع الضعيفة وغير المدروسة أولًا. اضغط يومًا لتسجيله.',
  'Never studied': 'لم تُدرس بعد',
  'Not started': 'لم تبدأ',
  Weak: 'ضعيف',
  OK: 'مقبول',
  Strong: 'قوي',
  'Weak →': 'ضعيف ←',
  'OK →': 'مقبول ←',
  'Strong → clear. Backfill past days to build your retrospective timetable.':
    'قوي ← مسح. سجّل الأيام السابقة لبناء جدولك الاسترجاعي.',
  'Tap a day:': 'اضغط يومًا:',
  'No subjects yet.': 'لا توجد مواد بعد.',
  'Everything has been studied today 🎉': 'تمت دراسة كل شيء اليوم 🎉',
  'Add topics below to get daily picks.': 'أضف مواضيع بالأسفل لتحصل على اختيارات يومية.',
  'Exams & quizzes': 'الاختبارات والاختبارات القصيرة',
  '+ Add': '+ إضافة',
  'Add exam or quiz': 'إضافة اختبار',
  '📝 Exam': '📝 اختبار',
  '❓ Quiz / test': '❓ اختبار قصير',
  'Time (optional)': 'الوقت (اختياري)',
  Date: 'التاريخ',
  'Score (after it)': 'الدرجة (بعد الاختبار)',
  'Out of': 'من',
  'Room, syllabus, what to bring…': 'القاعة، المنهج، ما يجب إحضاره…',
  'e.g. Biochemistry midterm': 'مثال: نصفي الكيمياء الحيوية',
  'Log result': 'تسجيل النتيجة',
  'Nothing coming up. Add your exams and quizzes so you never miss one.':
    'لا شيء قادم. أضف اختباراتك حتى لا يفوتك أي منها.',
  'Student mode': 'وضع الطالب',
  "Adds a Study tab: revision timetable, today's picks, and exams":
    'يضيف تبويب الدراسة: جدول المراجعة واختيارات اليوم والاختبارات',
  // settings
  General: 'عام',
  'Sound effects': 'المؤثرات الصوتية',
  'Chimes when you finish or undo something': 'نغمة عند الإنجاز أو التراجع',
  'Language / اللغة': 'اللغة / Language',
  'Default priority for new tasks': 'الأولوية الافتراضية للمهام الجديدة',
  'Show completed tasks': 'إظهار المهام المكتملة',
  'The dimmed "Completed" list under your tasks': 'قائمة "المكتملة" الباهتة أسفل مهامك',
  'Default due date for new tasks': 'تاريخ الاستحقاق الافتراضي للمهام الجديدة',
  'No date': 'بدون تاريخ',
  'Sort open tasks by': 'ترتيب المهام المفتوحة حسب',
  'Due date': 'تاريخ الاستحقاق',
  'Newest first': 'الأحدث أولًا',
  'A to Z': 'أبجديًا',
  'Tasks tab opens on': 'يفتح تبويب المهام على',
  Overdue: 'متأخرة',
  'Auto-archive finished tasks': 'أرشفة المهام المنجزة تلقائيًا',
  Never: 'أبدًا',
  'After 1 day': 'بعد يوم',
  'After 7 days': 'بعد 7 أيام',
  'After 30 days': 'بعد 30 يومًا',
  'Group tasks into tag folders': 'تجميع المهام في مجلدات وسوم',
  'Turn off for one flat list': 'أوقفه للحصول على قائمة واحدة',
  'Show notes on task rows': 'إظهار الملاحظات في صفوف المهام',
  'Show checklist items on task rows': 'إظهار عناصر القائمة في صفوف المهام',
  'Off keeps just the 2/4 counter': 'عند الإيقاف يبقى العدّاد فقط',
  'Overdue tasks on the Dashboard': 'المهام المتأخرة في لوحة المتابعة',
  "Adds late tasks to Today's tasks": 'يضيف المهام المتأخرة إلى مهام اليوم',
  'Hide habits done today': 'إخفاء العادات المنجزة اليوم',
  'Same as the chip in the Habits tab': 'مثل الزر في تبويب العادات',
  'Compact habit list': 'قائمة عادات مضغوطة',
  'One tight row per habit': 'صف مضغوط لكل عادة',
  'New avoid habits: a day counts as': 'عادات التجنّب الجديدة: يُحتسب اليوم',
  'Clean unless I log a slip': 'نظيفًا ما لم أسجّل انزلاقًا',
  'A slip unless I tick it clean': 'انزلاقًا ما لم أعلّمه نظيفًا',
  'Hide avoid habits while clean': 'إخفاء عادات التجنّب وهي نظيفة',
  'Only matters when "Hide habits done today" is on': 'يؤثر فقط عند تفعيل "إخفاء العادات المنجزة اليوم"',
  'Ask before deleting': 'اسأل قبل الحذف',
  'You always get a 6-second Undo after deleting.': 'يظهر لك زر تراجع لمدة 6 ثوانٍ بعد كل حذف.',
  'Dashboard sections': 'أقسام لوحة المتابعة',
  'Heatmap and charts': 'الخريطة الحرارية والرسوم',
  'Your data': 'بياناتك',
  'Storage & backup': 'التخزين والنسخ الاحتياطي',
  "Stored in this browser's IndexedDB. Export regularly to back up or move to another device.":
    'تُحفظ البيانات في IndexedDB بهذا المتصفح. صدّر نسخة بانتظام للحفظ أو للنقل إلى جهاز آخر.',
  'Last backup:': 'آخر نسخة احتياطية:',
  'Storage:': 'التخزين:',
  never: 'أبدًا',
  'not protected': 'غير محمي',
  protected: 'محمي',
  'checking…': 'جارٍ الفحص…',
  unknown: 'غير معروف',
  'Ask again': 'اسأل مجددًا',
  Version: 'الإصدار',
  'Export JSON': 'تصدير JSON',
  'Import JSON': 'استيراد JSON',
  'Copy backup text': 'نسخ نص النسخة الاحتياطية',
  'Paste backup text': 'لصق نص النسخة الاحتياطية',
  'Erase everything': 'مسح كل شيء',
  'Backup as text': 'نسخة احتياطية كنص',
  'Restore from text': 'استعادة من نص',
  'Copy this and paste it somewhere safe, like a note or a message to yourself.':
    'انسخ هذا والصقه في مكان آمن، مثل ملاحظة أو رسالة لنفسك.',
  'Paste a backup you copied earlier. This replaces all current data.':
    'الصق نسخة احتياطية نسختها سابقًا. هذا يستبدل كل البيانات الحالية.',
  'Paste backup here…': 'الصق النسخة الاحتياطية هنا…',
  'Copied ✓': 'تم النسخ ✓',
  'Select all and copy manually': 'حدّد الكل وانسخ يدويًا',
  'The browser may clear this data if the phone runs low on space. Bookmarking the page or adding it to the home screen often lets it be protected.':
    'قد يمسح المتصفح هذه البيانات إذا قلّت مساحة الهاتف. حفظ الصفحة في المفضلة أو إضافتها إلى الشاشة الرئيسية يساعد على حمايتها.',
  'Weekly · ': 'أسبوعي · ',
  'Monthly · ': 'شهري · ',
  'Annual · ': 'سنوي · ',
  // toasts / dialogs
  'Task deleted.': 'تم حذف المهمة.',
  'Goal deleted.': 'تم حذف الهدف.',
  'Habit deleted.': 'تم حذف العادة.',
  'Topic deleted.': 'تم حذف الموضوع.',
  'Deleted.': 'تم الحذف.',
  'Under a minute, so nothing was logged': 'أقل من دقيقة، لم يُسجَّل شيء',
  'Those topics already exist': 'هذه المواضيع موجودة بالفعل',
  'Delete this goal? Linked tasks and sub-goals are kept but unlinked.':
    'حذف هذا الهدف؟ تبقى المهام والأهداف الفرعية المرتبطة لكن دون ارتباط.',
  'Delete this habit and its history?': 'حذف هذه العادة وسجلها؟',
  'Erase all tasks, goals, habits and history? This cannot be undone.':
    'مسح كل المهام والأهداف والعادات والسجل؟ لا يمكن التراجع.',
  "This can't be undone.": 'لا يمكن التراجع عن هذا.',
  "This can't be undone. Tip: archive it instead to keep its history.":
    'لا يمكن التراجع عن هذا. نصيحة: أرشفها بدلًا من ذلك للاحتفاظ بسجلها.',
  'Set a target number for this goal (for example 10).': 'حدد رقمًا مستهدفًا لهذا الهدف (مثال: 10).',
  'Set a target number for this goal (for example 40).': 'حدد رقمًا مستهدفًا لهذا الهدف (مثال: 40).',
  '(Leave empty to remove the folder. Its habits are kept.)': '(اتركه فارغًا لإزالة المجلد. تبقى عاداته.)',
  "This can't be undone. Not-completed archived tasks are kept.": 'لا يمكن التراجع. تبقى المهام المؤرشفة غير المكتملة.',
  'Replace all current data with this backup?': 'استبدال كل البيانات الحالية بهذه النسخة الاحتياطية؟',
  None: 'لا شيء',
  'Tap a day to rate it:': 'اضغط يومًا لتقييمه:',
  Weak: 'ضعيف',
  Strong: 'قوي',
  Clear: 'مسح',
  'Backfill past days to build your retrospective timetable.': 'سجّل الأيام السابقة لبناء جدولك الاسترجاعي.',
  'To review': 'للمراجعة',
  'Studied today': 'درست اليوم',
  'Days to next exam': 'أيام للاختبار القادم',
  'How did each topic feel today? Weak and untouched topics come first.':
    'كيف كان كل موضوع اليوم؟ المواضيع الضعيفة وغير المدروسة أولًا.',
  'Add subject or topics': 'إضافة مادة أو مواضيع',
  'Everything has been studied today': 'تمت دراسة كل شيء اليوم',
  'Due for review': 'مستحق للمراجعة',
  'Show fewer': 'عرض أقل',
  Share: 'مشاركة',
  'More items…': 'عناصر أخرى…',
  today: 'اليوم',
  Insights: 'الإحصاءات',
  'Topics studied per day': 'المواضيع المدروسة يوميًا',
  'Not studied yet': 'لم تُدرس بعد',
  'Study sessions': 'جلسات الدراسة',
  'Topics studied': 'المواضيع المدروسة',
  'Exams and quizzes this week': 'اختبارات هذا الأسبوع',
  'Spaced repetition': 'التكرار المتباعد',
  'Topics come back for review when their date arrives': 'تعود المواضيع للمراجعة عند حلول موعدها',
  'Review Weak topics after': 'مراجعة المواضيع الضعيفة بعد',
  'Review OK topics after': 'مراجعة المواضيع المقبولة بعد',
  'Review Strong topics after': 'مراجعة المواضيع القوية بعد',
  '1, 3, 7, 14, 30 days': '1، 3، 7، 14، 30 يومًا',
  '1, 2, 4, 7, 14 days (tight)': '1، 2، 4، 7، 14 يومًا (مكثف)',
  '2, 5, 10, 21, 45 days (relaxed)': '2، 5، 10، 21، 45 يومًا (مريح)',
  'Due for review': 'حان وقت المراجعة',
  'Share with friends': 'المشاركة مع الأصدقاء',
  'Send habits, tasks or homework, exams and quizzes, and study topics to a friend as a small JSON file or text. Your history, check-ins and scores are never included.':
    'أرسل العادات أو المهام والواجبات أو الاختبارات أو مواضيع الدراسة إلى صديق كملف JSON صغير أو كنص. لا يتم إرسال سجلك أو تسجيلاتك أو درجاتك أبدًا.',
  'Share items…': 'مشاركة عناصر…',
  'Import shared items…': 'استيراد عناصر مشاركة…',
  'Share items': 'مشاركة عناصر',
  'Tick what to send. Only titles, dates, notes and settings are shared.':
    'حدد ما تريد إرساله. تُشارَك العناوين والتواريخ والملاحظات والإعدادات فقط.',
  'Tasks and homework': 'المهام والواجبات',
  'Exams and quizzes': 'الاختبارات والاختبارات القصيرة',
  'Study topics': 'مواضيع الدراسة',
  'Nothing to share yet.': 'لا شيء للمشاركة بعد.',
  'Select all': 'تحديد الكل',
  Clear: 'مسح',
  'Save file': 'حفظ ملف',
  'Copy text': 'نسخ النص',
  'Share…': 'مشاركة…',
  'Import shared items': 'استيراد عناصر مشاركة',
  'Paste what your friend sent, or choose their .json file. You will see a preview before anything is added.':
    'الصق ما أرسله صديقك أو اختر ملف .json الخاص به. سترى معاينة قبل إضافة أي شيء.',
  'Paste shared text here…': 'الصق النص المشارَك هنا…',
  'Choose file': 'اختيار ملف',
  Preview: 'معاينة',
  'Add shared items?': 'إضافة العناصر المشاركة؟',
  'Add selected': 'إضافة المحدد',
  'Nothing usable in that file.': 'لا يوجد شيء صالح في هذا الملف.',
  'Tick at least one item first': 'حدد عنصرًا واحدًا على الأقل أولًا',
  'Could not copy on this browser. Use Save file instead.': 'تعذر النسخ في هذا المتصفح. استخدم حفظ ملف بدلًا من ذلك.',
  'Sharing is not available here. Use Copy text.': 'المشاركة غير متاحة هنا. استخدم نسخ النص.',
  "That isn't valid shared text. Ask your friend to share it again.":
    'هذا ليس نصًا مشاركًا صالحًا. اطلب من صديقك مشاركته مجددًا.',
  "That isn't a shared GoalTerra file.": 'هذا ليس ملف مشاركة من GoalTerra.',
  habits: 'العادات',
  'tasks done': 'مهام منجزة',
  'tasks missed': 'مهام فائتة',
  'Item one\nItem two': 'عنصر أول\nعنصر ثانٍ',
};
const PAT = [
  [/^Could not save: (.+)$/, (m) => `تعذّر الحفظ: ${m[1]}`],
  [/^Saved (goalterra-.+)\.$/, (m) => `تم حفظ ${m[1]}.`],
  [/^Backup failed: (.+)$/, (m) => `فشل النسخ الاحتياطي: ${m[1]}`],
  [/^Delete "([^"]+)" on (.+)\?$/, (m) => `حذف "${m[1]}" يوم ${m[2]}؟`],
  [
    /^A rest day keeps every streak intact and stops the boss counterattacking\. You have (\d+) rest tokens?; you earn one for each weekly boss you beat\.$/,
    (m) =>
      `يوم الراحة يحافظ على كل سلاسلك ويمنع الزعيم من الهجوم. لديك ${m[1]} من رموز الراحة؛ تكسب رمزًا مع كل زعيم أسبوعي تهزمه.`,
  ],
  [/^No weekly goals for (.+)\.$/, (m) => `لا أهداف أسبوعية لـ ${m[1]}.`],
  [/^⚡ (.+) defeated!$/, (m) => `⚡ هُزم ${m[1]}!`],
  [/^(\d+) guardians? beaten$/, (m) => `${m[1]} حارس مهزوم`],
  [/^👑 (.+) defeated!$/, (m) => `👑 هُزم ${m[1]}!`],
  [/^(\d+) due · (\d+) done$/, (m) => `${m[1]} مستحقة · ${m[2]} منجزة`],
  [/^Finished this day · (\d+)$/, (m) => `أُنجز في هذا اليوم · ${m[1]}`],
  [/^(.+): (\d+) due, (\d+) done$/, (m) => `${m[1]}: ${m[2]} مستحقة، ${m[3]} منجزة`],
  [/^Focus (\d+) min$/, (m) => `تركيز ${m[1]} دقيقة`],
  [/^(\d+) min$/, (m) => `${m[1]} دقيقة`],
  [/^Logged (\d+) min on "(.+)"\.$/, (m) => `سُجّلت ${m[1]} دقيقة على "${m[2]}".`],
  [
    /^Focus done: (\d+) min on "(.+)"\. Break time\.$/,
    (m) => `انتهى التركيز: ${m[1]} دقيقة على "${m[2]}". وقت الاستراحة.`,
  ],
  [
    /^(\d+) of (\d+) (weekly|monthly|annual|sub) goals done(?: · (\d+) still to plan)?$/,
    (m) => `${m[1]} من ${m[2]} أهداف ${HZ_AR[m[3]]} منجزة${m[4] ? ` · ${m[4]} بلا تخطيط بعد` : ''}`,
  ],
  [/^Supports which (weekly|monthly|annual|5-year) goal\??$/, (m) => `يدعم أي هدف ${HZ1_AR[m[1]]}؟`],
  [/^New (monthly|annual|5-year) goal…?$/, (m) => `هدف ${HZ1_AR[m[1]]} جديد…`],
  [
    /^How many (weekly|monthly|annual) goals\? \(default (\d+)\)$/,
    (m) => `كم هدفًا ${HZ1_AR[m[1]]}؟ (الافتراضي ${m[2]})`,
  ],
  [/^Built from (weekly|monthly|annual) goals$/, (m) => `مبني من أهداف ${HZ_AR[m[1]]}`],
  [
    /^Add this week's steps under your (.+) goals\. Each one moves its monthly goal forward\.$/,
    (m) => `أضف خطوات هذا الأسبوع تحت أهداف ${m[1]}. كل خطوة تدفع هدفها الشهري للأمام.`,
  ],
  [
    /^No monthly goals built from weekly goals for (.+) yet\. Add standalone goals below, or create a monthly goal on the Goals tab first\.$/,
    (m) =>
      `لا أهداف شهرية مبنية من أهداف أسبوعية لـ ${m[1]} بعد. أضف أهدافًا مستقلة أدناه، أو أنشئ هدفًا شهريًا في تبويب الأهداف أولًا.`,
  ],
  [/^(\d+)\/(\d+) done today$/, (m) => `${m[1]}/${m[2]} منجزة اليوم`],
  [/^(\d+)\/(\d+) clean today$/, (m) => `${m[1]}/${m[2]} نظيفة اليوم`],
  [/^(\d+) days? clean streak$/, (m) => `سلسلة نظيفة: ${m[1]} ${AYAM(m[1])}`],
  [
    /^(\d+) items? · deleted tasks and habits are kept (\d+) days$/,
    (m) => `${m[1]} عنصر · تُحفظ المهام والعادات المحذوفة ${m[2]} يومًا`,
  ],
  [
    /^(\d+) deleted tasks? and habits, kept (\d+) days$/,
    (m) => `${m[1]} من المهام والعادات المحذوفة، تُحفظ ${m[2]} يومًا`,
  ],
  [/^(\d+) tasks a day$/, (m) => `${m[1]} مهام يوميًا`],
  [
    /^(.+) (\d{4}-\d\d-\d\d): (not studied|Weak|OK|Strong)$/,
    (m) => `${m[1]} ${m[2]}: ${m[3] === 'not studied' ? 'لم يُدرس' : AR[m[3]]}`,
  ],
  [/^(\d+) moved to Trash\.$/, (m) => `نُقل ${m[1]} إلى سلة المحذوفات.`],
  [/^Pulled (\d+) into today\.$/, (m) => `سُحب ${m[1]} إلى اليوم.`],
  [/^Marked (\d+) done\.$/, (m) => `عُلّمت ${m[1]} كمنجزة.`],
  [/^Archived (\d+) tasks?\.$/, (m) => `أُرشفت ${m[1]} مهمة.`],
  [/^Updated (\d+) (tasks?|habits?)\.$/, (m) => `تم تحديث ${m[1]} ${m[2][0] === 't' ? 'مهمة' : 'عادة'}.`],
  [/^Delete "([^"]+)"\?$/, (m) => `حذف "${m[1]}"؟`],
  [/^Delete "(.+)" and its history\?$/, (m) => `حذف "${m[1]}" وسجله؟`],
  [/^Delete (\d+) (tasks?|habits?)\?$/, (m) => `حذف ${m[1]} ${m[2][0] === 't' ? 'مهمة' : 'عادة'}؟`],
  [
    /^It stays in Trash \(Settings\) for (\d+) days\.( Tip: archive it instead to keep it with your tasks\.)?$/,
    (m) =>
      `سيبقى في سلة المحذوفات (الإعدادات) ${m[1]} يومًا.${m[2] ? ' نصيحة: أرشفه بدلًا من ذلك ليبقى مع مهامك.' : ''}`,
  ],
  [/^They stay in Trash \(Settings\) for (\d+) days\.$/, (m) => `ستبقى في سلة المحذوفات (الإعدادات) ${m[1]} يومًا.`],
  [
    /^Delete (\d+) items? in Trash forever\? This can't be undone\.$/,
    (m) => `حذف ${m[1]} عنصر من السلة نهائيًا؟ لا يمكن التراجع.`,
  ],
  [/^Current value(?: \((.+)\))?:$/, (m) => `القيمة الحالية${m[1] ? ` (${m[1]})` : ''}:`],
  [/^Titan day: why are you (.+)\? Type a reason\.$/, (m) => `يوم الجبّار: لماذا ${WHY_AR[m[1]] || m[1]}؟ اكتب سببًا.`],
  [/^Import failed: (.+)$/, (m) => `فشل الاستيراد: ${m[1]}`],
  [/^Restore failed: (.+)$/, (m) => `فشلت الاستعادة: ${m[1]}`],
  [/^Permanently delete (\d+) completed archived tasks?\?$/, (m) => `حذف ${m[1]} مهمة مؤرشفة مكتملة نهائيًا؟`],

  [/^(\d+) days? this month$/, (m) => `${m[1]} يومًا هذا الشهر`],
  [/^(\d+) studied today$/, (m) => `${m[1]} تمت دراستها اليوم`],
  [/^(\d+) weak$/, (m) => `${m[1]} ضعيفة`],
  [/^(\d+) not started$/, (m) => `${m[1]} لم تبدأ`],
  [/^(\d+)\/(\d+) done$/, (m) => `${m[1]}/${m[2]} منجز`],
  [/^(\d+)\/(\d+) strong$/, (m) => `${m[1]}/${m[2]} قوية`],
  [/^(\d+)\/(\d+) due done$/, (m) => `${m[1]}/${m[2]} مستحق منجز`],
  [/^(\d+) archived · (\d+) completed$/, (m) => `${m[1]} مؤرشفة · ${m[2]} مكتملة`],
  [/^(\d+) goals? from past periods needs? a review$/, (m) => `${m[1]} هدف من فترات سابقة يحتاج مراجعة`],
  [/^(\d+) overdue from earlier days →$/, (m) => `${m[1]} متأخرة من أيام سابقة →`],
  [/^(\d+) past exams?\/quiz(?:zes)? without a result$/, (m) => `${m[1]} اختبار سابق بدون نتيجة`],
  [/^(\d+)×(?: per week|\/week)$/, (m) => `${m[1]}× أسبوعيًا`],
  [/^(\d+) in 14 days$/, (m) => `${m[1]} خلال 14 يومًا`],
  [
    /^(\d+) tasks · (\d+) goals · (\d+) habits · (\d+) check-ins$/,
    (m) => `${m[1]} مهمة · ${m[2]} هدف · ${m[3]} عادة · ${m[4]} تسجيل`,
  ],
  [/^30-day (\d+)%$/, (m) => `آخر 30 يومًا ${m[1]}%`],
  [/^This week (\d+\/\d+)$/, (m) => `هذا الأسبوع ${m[1]}`],
  [/^(\d+)\/(\d+) this wk$/, (m) => `${m[1]}/${m[2]} هذا الأسبوع`],
  [/^Check off (.+) for today$/, (m) => `تعليم ${m[1]} لهذا اليوم`],
  [/^Clean today\. Tap to log a slip$/, () => 'نظيف اليوم. اضغط لتسجيل انزلاق'],
  [/^Slipped today\. Tap to undo$/, () => 'انزلاق اليوم. اضغط للتراجع'],
  [/^Delete (\d+) completed$/, (m) => `حذف ${m[1]} مكتملة`],
  [/^Delete "(.+)"\?$/, (m) => `حذف "${m[1]}"؟`],
  [/^Delete topic "(.+)" and its study log\?$/, (m) => `حذف الموضوع "${m[1]}" وسجل دراسته؟`],
  [/^Delete (.+)$/, (m) => `حذف ${m[1]}`],
  [/^Edit (.+)$/, (m) => `تعديل ${m[1]}`],
  [/^Completed · (\d+)$/, (m) => `المكتملة · ${m[1]}`],
  [/^Completed (.+)$/, (m) => `اكتملت ${m[1]}`],
  [/^Done (.+)$/, (m) => `أُنجزت ${m[1]}`],
  [/^Created (.+)$/, (m) => `أُنشئت ${m[1]}`],
  [/^Overdue · (.+)$/, (m) => `متأخرة · ${m[1]}`],
  [/^(\d+) HP to go\. It escapes tonight\.$/, (m) => `باقي ${m[1]} من الصحة. يهرب الليلة.`],
  [/^(\d+) HP to go$/, (m) => `باقي ${m[1]} من الصحة`],
  [/^HP (\d+)$/, (m) => `الصحة ${m[1]}`],
  [/^Lv (\d+)$/, (m) => `المستوى ${m[1]}`],
  [/^(\d+) \/ (\d+) XP$/, (m) => `${m[1]} / ${m[2]} خبرة`],
  [/^(\d+) \/ (\d+) damage$/, (m) => `${m[1]} / ${m[2]} ضرر`],
  [/^Best hit (\d+)$/, (m) => `أقوى ضربة ${m[1]}`],
  [/^(\d+) beaten · (\d+) escaped$/, (m) => `${m[1]} مهزوم · ${m[2]} هارب`],
  [/^🏆 (.+) defeated!$/, (m) => `🏆 هُزم ${m[1]}!`],
  [
    /^(\d+) days? late$/,
    (m) => `متأخرة ${+m[1] === 1 ? 'يومًا' : +m[1] === 2 ? 'يومين' : m[1] + ' ' + (+m[1] <= 10 ? 'أيام' : 'يومًا')}`,
  ],
  [/^(\d+) days left$/, (m) => `باقي ${+m[1] === 2 ? 'يومان' : m[1] + ' ' + (+m[1] <= 10 ? 'أيام' : 'يومًا')}`],
  [/^in (\d+) days$/, (m) => `بعد ${m[1]} يومًا`],
  [/^(\d+) days? ago$/, (m) => `قبل ${m[1]} يومًا`],
  [/^Last: (.+)$/, (m) => `آخر مرة: ${trText(m[1])}`],
  [/^(Hide|Show) past \((.+)\)$/, (m) => `${m[1] === 'Hide' ? 'إخفاء' : 'إظهار'} السابقة (${trText(m[2])})`],
  [/^(\d+) · result missing$/, (m) => `${m[1]} · النتيجة ناقصة`],
  [/^Plan (.+)$/, (m) => `تخطيط ${m[1]}`],
  [/^Review (\d+) goals?$/, (m) => `مراجعة ${m[1]} هدف`],
  [/^Carry to (.+)$/, (m) => `ترحيل إلى ${m[1]}`],
  [/^Topic (.+): not studied$/, (m) => `الموضوع ${m[1]}: لم يُدرس`],
  [/^Topic (.+): (Weak|OK|Strong)$/, (m) => `الموضوع ${m[1]}: ${AR[m[2]]}`],
  [/^default (\d+)$/, (m) => `الافتراضي ${m[1]}`],
  [/^Activity heatmap: (\d+) actions on (\d+) days$/, (m) => `خريطة النشاط: ${m[1]} إجراء في ${m[2]} يومًا`],
  [
    /^Tasks completed per day, last 14 days, (\d+) total$/,
    (m) => `المهام المنجزة يوميًا، آخر 14 يومًا، المجموع ${m[1]}`,
  ],
  [/^(\d+) days? clean$/, (m) => `${m[1]} يومًا نظيفًا`],
  [/^(\d+) days?$/, (m) => `${m[1]} يومًا`],
  [/^Added (\d+) topics? to (.+)$/, (m) => `تمت إضافة ${m[1]} موضوع إلى ${m[2]}`],
  [/^Goal complete: (.+)$/, (m) => `اكتمل الهدف: ${m[1]}`],
  [/^Next "(.+)" on (.+)$/, (m) => `التالية "${m[1]}" في ${m[2]}`],
  [
    /^Slip logged for "(.+)"\. Tap the day again to undo\.$/,
    (m) => `تم تسجيل انزلاق في "${m[1]}". اضغط اليوم مرة أخرى للتراجع.`,
  ],
  [/^(.+): all done for today$/, (m) => `${m[1]}: اكتمل كل شيء اليوم`],
  [/^Deleted (\d+) archived tasks?\.$/, (m) => `تم حذف ${m[1]} مهمة مؤرشفة.`],
  [/^Permanently delete (\d+) completed archived tasks?\?$/, (m) => `حذف ${m[1]} مهمة مؤرشفة مكتملة نهائيًا؟`],
  [/^Restored (.+)\.$/, (m) => `تمت الاستعادة: ${m[1]}.`],
  [/^Imported (.+)\.$/, (m) => `تم الاستيراد: ${m[1]}.`],
  [/^Saved (.+) \((.+) KB\) to Downloads\.$/, (m) => `تم حفظ ${m[1]} (${m[2]} ك.ب) في التنزيلات.`],
  [/^Rename folder "(.+)"$/, (m) => `إعادة تسمية المجلد "${m[1]}"`],
  [/^Last backup (.+)$/, (m) => `آخر نسخة احتياطية ${m[1]}`],
  [/^Copied (\d+) items?\. Paste it to your friend\.$/, (m) => `تم نسخ ${m[1]} عنصر. الصقه لصديقك.`],
  [/^Saved (goal-tracker-share-.+)$/, (m) => `تم حفظ ${m[1]}`],
  [
    /^Added (\d+) items?(?:, skipped (\d+) you already have)?(\. Student mode is on)?$/,
    (m) => `تمت إضافة ${m[1]} عنصر${m[2] ? `، وتخطي ${m[2]} موجود لديك` : ''}${m[3] ? '. وضع الطالب مفعّل' : ''}`,
  ],
  [/^(\d+) strong$/, (m) => `${m[1]} قوية`],
  [/^(\d+) OK$/, (m) => `${m[1]} مقبولة`],
  [/^Last studied: (.+)$/, (m) => `آخر دراسة: ${trText(m[1])}`],
  [/^Exam (.+)$/, (m) => `الاختبار ${trText(m[1])}`],
  [/^(\d+) in 14 days$/, (m) => `${m[1]} خلال 14 يومًا`],
  [
    /^Topics studied per day, last 14 days, (\d+) total$/,
    (m) => `المواضيع المدروسة يوميًا، آخر 14 يومًا، المجموع ${m[1]}`,
  ],
  [/^Show all (\d+) completed$/, (m) => `عرض كل المكتملة (${m[1]})`],
  [/^Next review: (.+)$/, (m) => `المراجعة التالية: ${m[1]}`],
  [/^(\d+) due for review$/, (m) => `${m[1]} بانتظار المراجعة`],
  [/^(\d+) to go$/, (m) => `باقي ${m[1]}`],
  [/^(\d+) tasks? done$/, (m) => `${m[1]} مهمة منجزة`],
  [/^(\d+) tasks? missed$/, (m) => `${m[1]} مهمة فائتة`],
  [
    /^· (\d+) of (\d+) weekly goals done · (\d+) still to plan$/,
    (m) => `· ${m[1]} من ${m[2]} أهداف أسبوعية منجزة · ${m[3]} بانتظار التخطيط`,
  ],
];
const ARROW = { '→': '←', '←': '→' };
function trCore(s) {
  if (Object.prototype.hasOwnProperty.call(AR, s)) return AR[s];
  for (const [re, fn] of PAT) {
    const m = s.match(re);
    if (m) return fn(m);
  }
  return null;
}
function trText(s) {
  s = String(s);
  const t = s.trim();
  if (!t || !/[A-Za-z]/.test(t)) return s;
  const lead = s.slice(0, s.length - s.trimStart().length),
    trail = s.slice(s.trimEnd().length);
  let r = trCore(t);
  if (r === null) {
    const m = t.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9)\]]*)$/);
    if (m && m[2]) {
      const c = trCore(m[2]);
      if (c !== null) r = m[1] + c + m[3];
    }
  }
  if (r === null) return s;
  return lead + r.replace(/[→←]/g, (c) => ARROW[c]) + trail;
}
const TR_ATTRS = ['placeholder', 'title', 'aria-label'];
function trNode(root) {
  if (S.cfg.lang !== 'ar' || !root) return;
  const doText = (n) => {
    const p = n.parentElement;
    if (
      p &&
      (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'TEXTAREA' || p.closest('[translate=no]'))
    )
      return;
    const v = n.nodeValue,
      r = trText(v);
    if (r !== v) {
      n._en = v;
      n.nodeValue = r;
    }
  };
  const doEl = (e) => {
    for (const a of TR_ATTRS) {
      const v = e.getAttribute && e.getAttribute(a);
      if (v) {
        const r = trText(v);
        if (r !== v) {
          if (!e.hasAttribute('data-en-' + a)) e.setAttribute('data-en-' + a, v);
          e.setAttribute(a, r);
        }
      }
    }
  };
  if (root.nodeType === 3) {
    doText(root);
    return;
  }
  if (root.nodeType !== 1) return;
  doEl(root);
  root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(doEl);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) doText(n);
}
function untrNode(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (n._en !== undefined) {
      n.nodeValue = n._en;
      delete n._en;
    }
  }
  root.querySelectorAll('*').forEach((e) => {
    for (const a of TR_ATTRS) {
      const o = e.getAttribute('data-en-' + a);
      if (o !== null) {
        e.setAttribute(a, o);
        e.removeAttribute('data-en-' + a);
      }
    }
  });
}
function applyLang() {
  const ar = S.cfg.lang === 'ar';
  document.documentElement.lang = ar ? 'ar' : 'en';
  document.documentElement.dir = ar ? 'rtl' : 'ltr';
  LOCALE = ar ? 'ar-u-nu-latn' : undefined;
  const t = $('#today');
  if (t) t.textContent = new Date().toLocaleDateString(LOCALE, { weekday: 'long', month: 'long', day: 'numeric' });
  if (ar) trNode(document.body);
  else untrNode(document.body);
}
new MutationObserver(() =>
  setTimeout(() => {
    const h = dlg.querySelector('h3');
    if (h) dlg.setAttribute('aria-label', h.textContent);
  }, 0)
).observe(dlg, { childList: true });
new MutationObserver((ms) => {
  if (S.cfg.lang !== 'ar') return;
  for (const m of ms) for (const n of m.addedNodes) trNode(n);
}).observe(document.body, { childList: true, subtree: true });
const _al = window.alert.bind(window),
  _co = window.confirm.bind(window),
  _pr = window.prompt.bind(window);
const trMsg = (m) => (S.cfg.lang === 'ar' ? String(m).split('\n').map(trText).join('\n') : m);
window.alert = (m) => _al(trMsg(m));
window.confirm = (m) => _co(trMsg(m));
window.prompt = (m, d) => _pr(trMsg(m), d);

try {
  S.hideDone = localStorage.getItem('gt-hide-done') === '1';
} catch (e) {
  S.hideDone = false;
}
try {
  S.compact = localStorage.getItem('gt-compact') === '1';
} catch (e) {
  S.compact = false;
}
try {
  S.collapsed = new Set(JSON.parse(localStorage.getItem('gt-collapsed') || '[]'));
} catch (e) {
  S.collapsed = new Set();
}
try {
  S.forder = JSON.parse(localStorage.getItem('gt-forder') || '[]');
} catch (e) {
  S.forder = [];
}
const saveForder = () => {
  try {
    localStorage.setItem('gt-forder', JSON.stringify(S.forder));
  } catch (e) {}
};
const sortedHabits = () =>
  S.habits
    .map((h, i) => [h, i])
    .sort((a, b) => (a[0].order ?? a[1]) - (b[0].order ?? b[1]) || a[1] - b[1])
    .map((x) => x[0]);
const mvBtns = (k, id, extra) =>
  S.reorder
    ? `<span class="mv"><button type="button" class="icon" data-action="${k}" ${extra} data-d="-1" aria-label="Move up">▲</button><button type="button" class="icon" data-action="${k}" ${extra} data-d="1" aria-label="Move down">▼</button></span>`
    : '';
const saveCollapsed = () => {
  try {
    localStorage.setItem('gt-collapsed', JSON.stringify([...S.collapsed]));
  } catch (e) {}
};
