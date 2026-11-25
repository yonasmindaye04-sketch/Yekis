import "./marketing.css";
import { type Language, useI18n } from "./i18n";
import { LegalDocumentPage, type LegalSection } from "./LegalDocumentPage";

type PrivacyPageProps = {
  onNavigate: (page: string) => void;
};

type LocalizedPrivacyCopy = {
  effectiveDate: string;
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
};

function getPrivacyCopy(language: Language): LocalizedPrivacyCopy {
  if (language === "am") {
    return {
      effectiveDate: "ኖቬምበር 13፣ 2026",
      eyebrow: "ሕግ እና እምነት",
      title: "የግላዊነት ፖሊሲ",
      summary:
        "YeKis የማንነት፣ የገበያ ቦታ፣ የክፍያ፣ የግንኙነት እና የደህንነት መረጃዎችን እንዴት እንደሚይዝ እንዲሁም እርስዎ በመረጃዎ ላይ ያለዎትን ምርጫና መብቶች ያብራራል።",
      sections: [
        {
          id: "scope",
          title: "ማን ነን እና ይህ ፖሊሲ ምንን ይሸፍናል",
          content: (
            <>
              <p>
                YeKis መቀመጫውን በአዲስ አበባ፣ ኢትዮጵያ ያደረገ የኢትዮጵያ የፍሪላንስ የሥራ ገበያ ቦታ ነው። ይህ
                የግላዊነት ፖሊሲ YeKis የድረ-ገጹን ሲጎበኙ፣ መለያ ሲፈጥሩ፣ የዌብ የሥራ ቦታውን ወይም የቴሌግራም
                Mini Appን ሲጠቀሙ፣ ከድጋፍ ቡድኑ ጋር ሲገናኙ፣ ሥራ ሲለጥፉ፣ ሲያመለክቱ፣ ውል ሲዋዋሉ፣ የምዕራፍ
                ክፍያ ሲፈጽሙ ወይም ሲቀበሉ የግል መረጃዎን እንዴት እንደሚሰበስብ፣ እንደሚጠቀም፣ እንደሚያጋራ፣
                እንደሚያቆይ እና እንደሚጠብቅ ያብራራል።
              </p>
              <p>
                YeKis በእነዚህ አገልግሎቶች ውስጥ ለሚቀነባበሩ የግል መረጃዎች የመረጃ ተቆጣጣሪ (Data
                Controller) ነው። የገበያ ቦታ ተዋዋይ ወገኖችም ለአንድ ግብይት እርስ በርስ ለሚያጋሩት መረጃ
                (ለምሳሌ የደንበኛ የንግድ መገኛ አድራሻ ለተቀጠረው ባለሙያ ሲታይ) ራሳቸውን የቻሉ ተቆጣጣሪዎች ናቸው።
              </p>
            </>
          ),
        },
        {
          id: "information-we-collect",
          title: "የምንሰበስበው መረጃ",
          content: (
            <>
              <p>የገበያ ቦታውን ለማስኬድ፣ ለመጠበቅ እና ለማሻሻል የሚያስፈልገውን መረጃ ብቻ እንሰበስባለን።</p>
              <ul>
                <li>
                  <strong>የመለያ እና የማረጋገጫ መረጃዎች፡</strong> የመጀመሪያ እና የአባት ስም፣ የሚታይ ስም፣ የኢሜይል
                  አድራሻ፣ የስልክ ቁጥር፣ የትውልድ ቀን፣ ሚና፣ የቋንቋ እና የሰዓት ሰቅ ምርጫዎች፣ የይለፍ ቃል ሃሽ፣
                  የGoogle ወይም ሌላ የተገናኘ መለያ መለያ ቁጥር፣ የቴሌግራም ተጠቃሚ ወይም የውይይት መለያ፣ የማረጋገጫ
                  ሁኔታ እና የመለያ መፍጠሪያ ወይም ማሻሻያ ጊዜያት።
                </li>
                <li>
                  <strong>የመገለጫ እና የገበያ ቦታ መረጃዎች፡</strong> የግል መግለጫ፣ የመገለጫ ፎቶ፣ ክህሎቶች፣
                  የፖርትፎሊዮ ፋይሎች፣ የሥራ ዝግጁነት፣ የመገለጫ ታይነት፣ የሥራ ማስታወቂያዎች፣ የሥራ ፕሮፖዛሎች፣
                  የማጣሪያ ጥያቄ መልሶች፣ የጊግ (Gig) ዝርዝሮች እና ጥቅሎች፣ ውሎች፣ የምዕራፍ መግለጫዎች፣ የማስረከቢያ
                  ፋይሎች፣ መልዕክቶች፣ ግምገማዎች እና የመገለጫ እይታ እንቅስቃሴዎች።
                </li>
                <li>
                  <strong>የማንነት እና የሕግ ተገዢነት መረጃዎች፡</strong> የማረጋገጫ ደረጃ፣ UCID፣ የፋይዳ
                  ባዮሜትሪክ መለያ፣ የማንነት ሰነዶች፣ ሲመርጡ የሚያስገቡት የራስ ፎቶ (Selfie) ወይም ሌላ የማረጋገጫ
                  ምስል፣ የስምምነት መዝገቦች፣ የግምገማ ውሳኔዎች እና ሕጉ ሲጠይቅ የግብይት ክትትል ወይም አጠራጣሪ
                  ግብይት ሪፖርት መዝገቦች።
                </li>
                <li>
                  <strong>የፋይናንስ እና የክፍያ መረጃዎች፡</strong> የዋሌት ቀሪ ሂሳብ፣ የብር (ETB) መጠኖች፣
                  የክፍያ መሙላት እና የክፍያ ሁኔታ፣ የአገልግሎት ሰጪ ግብይት ማጣቀሻዎች፣ ገንዘብ ማውጣት እና የክፍያ
                  መድረሻዎች፣ የሌጀር ግቤቶች፣ የፕላትፎርም ክፍያዎች፣ የአገልግሎት ሰጪ ክፍያዎች፣ ሕጋዊ ተቀናሾች
                  እና የፋይናንስ ኦዲት መዝገቦች። YeKis ሙሉ የክፍያ ካርድ መረጃዎችን አያስቀምጥም፤ የክፍያ አገልግሎት
                  ሰጪዎች በቀጥታ ያስተናግዷቸዋል።
                </li>
                <li>
                  <strong>ግንኙነቶች፡</strong> የድጋፍ ውይይቶች፣ ቀጥታ መልዕክቶች፣ የክርክር መግለጫዎች እና
                  ማስረጃዎች፣ ማሳወቂያዎች፣ የኢሜይል እና የSMS መላኪያ መዝገቦች፣ የቴሌግራም መልዕክቶች እና
                  የሚሰጧቸው የስምምነት ምርጫዎች።
                </li>
                <li>
                  <strong>ቴክኒካዊ እና የደህንነት መረጃዎች፡</strong> የIP አድራሻ፣ የመሣሪያ እና የብራውዘር መረጃ፣
                  የጥያቄ መለያዎች፣ የመግቢያ እና የደህንነት ክስተቶች፣ የጊዜ ማህተሞች፣ የስህተት መዝገቦች እና
                  ለዋና ለውጦች የሚያዙ የኦዲት መዝገቦች።
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "sensitive-information",
          title: "ጥንቃቄ የሚያስፈልጋቸው የማንነት እና የፋይናንስ መረጃዎች",
          content: (
            <>
              <p>
                በፍሪላንስ የገበያ ቦታ ውስጥ ጥቅም ላይ የሚውሉ አንዳንድ መረጃዎች ጥንቃቄ የሚጠይቁ ናቸው። የማንነት
                ሰነዶች፣ ባዮሜትሪክ መለያዎች፣ የትውልድ ቀን፣ የፋይናንስ መዝገቦች እና የክርክር ማስረጃዎች ቢጋለጡ
                ከባድ ጉዳት ሊያስከትሉ ይችላሉ። YeKis እነዚህን መረጃዎች የሚያስኬደው እርስዎ ባቀረቡበት ዓላማ ብቻ
                ሲሆን ይህም የማንነት ማረጋገጫ፣ ማጭበርበር መከላከል፣ ክፍያ መፈጸም፣ ውል ማስተዳደር፣ ክርክር
                መፍታት እና የሕግ ወይም የቁጥጥር ግዴታዎችን መወጣትን ያካትታል።
              </p>
              <p>
                አላስፈላጊ የግል ወይም ጥንቃቄ የሚያስፈልጋቸው መረጃዎችን በሥራ ማስታወቂያ፣ በፕሮፖዛል፣ በመልዕክት፣
                በፖርትፎሊዮ ወይም በክርክር መግለጫ ውስጥ አያስቀምጡ። የKYC ሰነዶችን፣ የፋይናንስ መዝገቦችን እና
                ሌሎች የተገደቡ መዝገቦችን የመመልከት ፈቃድ በሠራተኛ ሚና የተገደበ ሲሆን በኦዲት መዝገብ ላይ ይጻፋል።
              </p>
            </>
          ),
        },
        {
          id: "how-we-use",
          title: "መረጃዎን ለምን እንጠቀማለን",
          content: (
            <ul>
              <li>መለያዎን ለመፍጠር እና ለመጠበቅ፣ ማንነትዎን ለማረጋገጥ እና የመግቢያ መዳረሻን መልሶ ለማግኘት።</li>
              <li>ማንነትን ለማረጋገጥ፣ ማጭበርበርን ለመፈተሽ፣ የገበያ ቦታ ደንቦችን ለማስፈጸም እና የፀረ-ገንዘብ ማጠብ ሕጎችን ለማክበር።</li>
              <li>ለሌሎች ተጠቃሚዎች እንዲታይ የመረጡትን መገለጫ፣ ፖርትፎሊዮ፣ ዝርዝሮች፣ ፕሮፖዛሎች እና ግምገማዎችን ለማሳየት።</li>
              <li>ደንበኞችን እና ባለሙያዎችን ለማገናኘት፣ ውሎችን ለመፍጠር፣ ምዕራፎችን ለማስተዳደር፣ ክፍያዎችን ለማስኬድ እና ክፍያዎችን ለማስላት።</li>
              <li>እንዲደርስዎት የጠየቋቸውን የአገልግሎት፣ የማስረከቢያ፣ የክፍያ፣ የደህንነት እና የመለያ ማሳወቂያዎችን ለመላክ።</li>
              <li>ድጋፍ ለመስጠት፣ ክርክሮችን ለመፍታት፣ ውሎችን ለማስፈጸም እና የገበያ ቦታ መዝገብን ለመጠበቅ።</li>
              <li>YeKisን፣ ተጠቃሚዎቹን እና ሕዝቡን ከማጭበርበር፣ ከጥቃት፣ ከአይፈለጌ መልዕክት እና ከሕገ-ወጥ ተግባር ለመጠበቅ።</li>
              <li>ትንታኔ (Analytics) ሲፈቅዱ አጠቃላይ የፕላትፎርም አጠቃቀምን ለመረዳት እና ምርቱን ለማሻሻል።</li>
              <li>የታክስ፣ የቁጥጥር፣ የኦዲት እና ሌሎች ሕጋዊ ግዴታዎችን ለመወጣት።</li>
            </ul>
          ),
        },
        {
          id: "legal-bases",
          title: "መረጃውን ለማስኬድ ያለን ሕጋዊ መሠረት",
          content: (
            <>
              <p>
                እንደ የሂደቱ ዓይነት YeKis የግል መረጃ ጥበቃ አዋጅ ቁጥር 1321/2024ን ጨምሮ በሚመለከታቸው
                ሕጎች መሠረት ከሚከተሉት ሕጋዊ መሠረቶች በአንዱ ወይም ከዚያ በላይ ይደገፋል፡
              </p>
              <ul>
                <li><strong>የውል አፈጻጸም፡</strong> እንደ መለያዎች፣ ውሎች፣ ምዕራፎች እና ክፍያዎች ያሉ የጠየቁትን አገልግሎት ለመስጠት መረጃውን ማስኬድ ሲያስፈልግ።</li>
                <li><strong>ሕጋዊ ግዴታ፡</strong> የማንነት፣ የፀረ-ገንዘብ ማጠብ (AML)፣ የታክስ፣ የኦዲት ወይም የመዝገብ አያያዝ ሕግ መረጃውን እንድናስኬድ ወይም እንድናቆይ ሲያስገድደን።</li>
                <li><strong>ሕጋዊ ጥቅም (Legitimate Interests)፡</strong> ከመብቶችዎ ጋር በማመዛዘን ለደህንነት፣ ማጭበርበርን ለመከላከል፣ አገልግሎቱን ለማሻሻል እና የገበያ ቦታውን ታማኝነት ለመጠበቅ አስፈላጊ ሲሆን።</li>
                <li><strong>ስምምነት (Consent)፡</strong> ለአማራጭ ትንታኔ እና የግብይት መልዕክቶች እንዲሁም ሕጉ በተለየ ሁኔታ ስምምነትን ሲጠይቅ።</li>
              </ul>
              <p>
                በመለያ ቅንብሮች በኩል ወይም እኛን በማነጋገር ስምምነትዎን በማንኛውም ጊዜ መሻር ይችላሉ። መሻር
                ከዚያ በፊት በሕጋዊ መንገድ የተከናወነውን ወይም በሌላ ሕጋዊ መሠረት ላይ የተመሠረተውን ሂደት አይነካም።
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "መረጃን የምናጋራው መቼ ነው",
          content: (
            <>
              <p>YeKis የግል መረጃን አይሸጥም። መረጃን የምናጋራው በዚህ ፖሊሲ ውስጥ ለተገለጹት ዓላማዎች ብቻ ነው፡</p>
              <ul>
                <li><strong>ሌሎች የገበያ ቦታ ተጠቃሚዎች፡</strong> የህዝብ መገለጫዎን ለማሳየት፣ ከእርስዎ ጋር ለመገናኘት፣ ፕሮፖዛል፣ ውል፣ ምዕራፍ፣ ግምገማ ወይም ክርክርን ለማስተዳደር እና ለግብይት የሚያስፈልገውን የማንነት መረጃ ለማሳየት።</li>
                <li><strong>የአገልግሎት ሰጪዎች፡</strong> በYeKis መመሪያ መረጃ የሚያስኬዱ የሆስቲንግ፣ የዳታቤዝ፣ የፋይል ማከማቻ፣ የRedis፣ የኢሜይል፣ የSMS፣ የክትትል እና የድጋፍ አገልግሎት ሰጪዎች።</li>
                <li><strong>የክፍያ አገልግሎት ሰጪዎች፡</strong> ክፍያን ለማረጋገጥ፣ የምዕራፍ ገንዘብ ለመያዝ ወይም ለመልቀቅ፣ ገንዘብ ለማውጣት እና መዝገቦችን ለማስታረቅ ቴሌብር እና ሌሎች የተዋቀሩ አገልግሎት ሰጪዎች።</li>
                <li><strong>የማንነት እና የመግቢያ አገልግሎት ሰጪዎች፡</strong> ለማረጋገጫ eSignet ወይም ፋይዳ፣ ለመግቢያ Google ወይም ሌላ የተዋቀረ አገልግሎት ሰጪ፣ እንዲሁም ለMini App ማረጋገጫ እና መልዕክቶች ቴሌግራም።</li>
                <li><strong>እርስዎ የፈቀዷቸው የትንታኔ አገልግሎት ሰጪዎች፡</strong> Google Analytics የሚጫነው የትንታኔ ኩኪዎችን ከተቀበሉ በኋላ በፕሮዳክሽን ውቅር ውስጥ ብቻ ነው።</li>
                <li><strong>ሙያዊ አማካሪዎች እና ባለሥልጣናት፡</strong> ሕጉ ሲጠይቅ ወይም መድረኩን እና ተጠቃሚዎቹን ለመጠበቅ አስፈላጊ ሲሆን ኦዲተሮች፣ ጠበቆች፣ ተቆጣጣሪዎች፣ ፍርድ ቤቶች፣ የሕግ አስከባሪ አካላት ወይም የፋይናንስ ደህንነት ባለሥልጣናት።</li>
                <li><strong>የንግድ ግብይት፡</strong> ውህደት፣ ፋይናንሲንግ፣ መዋቅራዊ ለውጥ ወይም ሽያጭ ሲኖር በሚስጥር ጥበቃ እና ለተጠቃሚዎች ማሳወቅ።</li>
              </ul>
            </>
          ),
        },
        {
          id: "international-transfers",
          title: "ማከማቻ እና ዓለም አቀፍ ዝውውሮች",
          content: (
            <>
              <p>
                YeKis ዋና አፕሊኬሽኑን፣ ዳታቤዙን እና የፋይል ማከማቻውን በኢትዮጵያ ውስጥ እንዲያስተናግድ ተደርጎ
                የተነደፈ ነው። የአሁኑ የምርት አገልግሎት የኢትዮጵያን ክላውድ ሪጅን ይጠቀማል። ነገር ግን ከሌላ
                ሀገር መግባት፣ ዓለም አቀፍ የማንነት ወይም የግንኙነት አገልግሎት መጠቀም ወይም ከኢትዮጵያ ውጭ
                የሚደረግ የድጋፍ መዳረሻ እንደ ዓለም አቀፍ ዝውውር ሊቆጠር ይችላል።
              </p>
              <p>
                ዝውውር አስፈላጊ በሚሆንበት ጊዜ YeKis በሚመለከተው ሕግ የሚጠየቁ የመዳረሻ፣ የውል እና
                የቴክኒክ ጥበቃዎችን ይጠቀማል። ከመረጃዎ ጋር ተያያዥ የሆኑ አገልግሎት ሰጪዎችን እና ጥበቃዎችን
                በተመለከተ መረጃ ለማግኘት ያግኙን።
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "መረጃን እንዴት እንደምንጠብቅ",
          content: (
            <>
              <p>YeKis ተመጣጣኝ የሆኑ ቴክኒካዊ እና ድርጅታዊ ጥበቃዎችን ይተገብራል፡</p>
              <ul>
                <li>Argon2id የይለፍ ቃል ሃሺንግ እና አጭር ዕድሜ ያላቸው፣ ሊሻሩ የሚችሉ የክፍለ ጊዜ ቶከኖች።</li>
                <li>ለፕሮዳክሽን ትራፊክ HTTPS፣ የደህንነት ራስጌዎች፣ Content Security Policy፣ የፍጥነት ገደብ እና ጥብቅ የጥያቄ ማረጋገጫ።</li>
                <li>ለማንነት፣ ለሕግ ተገዢነት፣ ለፋይናንስ፣ ለድጋፍ እና ለክርክር መዝገቦች በሚና ላይ የተመሠረተ መዳረሻ።</li>
                <li>ለሚስጥራዊ ፋይሎች የተገደበ የፋይል ማከማቻ እና በጊዜ የተገደቡ የተፈረሙ አገናኞች (Signed URLs)።</li>
                <li>ለዋና የፋይናንስ፣ የደህንነት እና የአስተዳደር ለውጦች የማይሻሩ የኦዲት መዝገቦች።</li>
                <li>ያልተለመዱ የግብይት ንድፎችን ለሰው ግምገማ የሚጠቁሙ የስጋት መቆጣጠሪያዎች።</li>
              </ul>
              <p>
                ምንም የመስመር ላይ አገልግሎት ፍጹም ደህንነትን ቃል መግባት አይችልም። የመረጃ ጥሰት መረጃዎን
                ከነካ፣ YeKis ክስተቱን ይገታል፣ የተጎዱ ክፍለ ጊዜዎችን ይሽራል፣ የተጎዱ ተጠቃሚዎችን እና
                አግባብነት ያለውን ባለሥልጣን በሕግ በተደነገገው ጊዜ ውስጥ ያሳውቃል እንዲሁም ምላሹን ይመዘግባል።
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "መረጃን ለምን ያህል ጊዜ እናቆያለን",
          content: (
            <>
              <p>
                YeKis የግል መረጃን የሚያቆየው ለተሰበሰበበት ዓላማ፣ አገልግሎቱን ለመስጠት፣ ክርክሮችን ለመፍታት
                እና ሕጋዊ ግዴታዎችን ለመወጣት አስፈላጊ እስከሆነ ድረስ ብቻ ነው። ዋናዎቹ የማቆያ ጊዜያት፡
              </p>
              <ul>
                <li><strong>ንቁ መለያ እና የገበያ ቦታ ይዘት፡</strong> መለያው ንቁ እስከሆነ እና የተገቡ ግብይቶችን ለማስኬድ እስከሚያስፈልግ ድረስ።</li>
                <li><strong>የማንነት፣ KYC፣ የፋይናንስ፣ የግብይት፣ የስምምነት፣ የክርክር እና የኦዲት መዝገቦች፡</strong> ሕግ ወይም የቁጥጥር መዝገብ አያያዝ ደንብ ሲጠይቅ በአጠቃላይ እስከ አስር ዓመታት ድረስ።</li>
                <li><strong>የድጋፍ ውይይቶች እና የክርክር ማስረጃዎች፡</strong> ጉዳዩ ክፍት እስከሆነ እና ሕጋዊ የይገባኛል ጥያቄዎችን ለማረጋገጥ ወይም ለመከላከል እስከሚያስፈልግ ጊዜ ድረስ።</li>
                <li><strong>የደህንነት እና ቴክኒካዊ መዝገቦች፡</strong> ክስተቶችን ለመመርመር፣ ውሎችን ለማስፈጸም እና አገልግሎቱን ለመጠበቅ እስከሚያስፈልግ ጊዜ ድረስ።</li>
                <li><strong>የስምምነት ታሪክ፡</strong> ምን እንደተስማሙ እና መቼ እንደተስማሙ እንደ ማስረጃ ይቀመጣል።</li>
              </ul>
              <p>
                መረጃዎ እንዲሰረዝ ሲጠይቁ፣ YeKis የመገለጫ ይዘትን፣ የመግቢያ መረጃዎችን፣ የግል ሚዲያዎችን፣
                እርስዎ የጻፉትን የውይይት ይዘት፣ የፖርትፎሊዮ እቃዎችን፣ ክህሎቶችን፣ ማሳወቂያዎችን እና
                ትንታኔዎችን ያጠፋል። መለያው ይዘጋል፣ ክፍለ ጊዜዎቹም ይሻራሉ። ሕግ YeKis እንዲያቆያቸው
                የሚጠይቃቸው የማንነት ማስረጃዎች፣ የKYC መዝገቦች፣ ዋሌቶች፣ ግብይቶች፣ የሌጀር ግቤቶች፣ የኦዲት
                መዝገቦች፣ ውሎች፣ ምዕራፎች፣ ክርክሮች እና ስለ እርስዎ የተጻፉ ግምገማዎች ለተፈለገው ጊዜ ይቆያሉ።
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "ኩኪዎች፣ የብራውዘር ማከማቻ እና ትንታኔ",
          content: (
            <>
              <p>
                YeKis ያለ እነርሱ መሥራት የማይችሉ ተግባራትን ለማከናወን የብራውዘር ማከማቻን ይጠቀማል፤ ይህም
                የማረጋገጫ ቶከኖችን፣ የገጽታ እና የቋንቋ ምርጫዎችን፣ የስምምነት ምርጫዎችን እና ጊዜያዊ የክፍያ
                መመለሻ ሁኔታን ያካትታል። አስፈላጊው ማከማቻ ለመለያ ደህንነት እና ለአገልግሎቱ መሥራት የግድ
                ስለሆነ አይጠፋም።
              </p>
              <p>
                አማራጭ ትንታኔ በፕሮዳክሽን ውስጥ Google Analyticsን የሚጠቀመው የመለኪያ መለያ ሲዋቀር እና
                እርስዎ የትንታኔ ኩኪዎችን ሲቀበሉ ብቻ ነው። የYeKis የትንታኔ ክስተቶች ኢሜይል፣ ስልክ ቁጥር፣ ስም፣
                የመለያ መለያ ወይም የተጠቃሚ ልዩ የክፍያ መጠኖችን እንዳይይዙ ተደርገው የተነደፉ ናቸው። በስምምነት
                ባነር ውስጥ ትንታኔን መቃወም እና በኋላም ምርጫዎን መቀየር ይችላሉ።
              </p>
            </>
          ),
        },
        {
          id: "your-rights",
          title: "የግላዊነት መብቶችዎ",
          content: (
            <>
              <p>በሚመለከተው ሕግ መሠረት የሚከተሉት መብቶች ሊኖሩዎት ይችላሉ፡</p>
              <ul>
                <li>YeKis ስለ እርስዎ የያዘውን የግል መረጃ ማወቅ እና ቅጂ ማግኘት።</li>
                <li>መረጃውን በሚነበብ እና ሊዛወር በሚችል ቅርጸት ማግኘት።</li>
                <li>ትክክል ያልሆነ ወይም ያልተሟላ መረጃን ማስተካከል።</li>
                <li>ሕጋዊ የማቆየት ግዴታ በሌለበት ጊዜ YeKis የግል መረጃን እንዲሰርዝ መጠየቅ።</li>
                <li>ስምምነትን መሻር እና አማራጭ የግብይት ወይም የትንታኔ ሂደትን ማስቆም።</li>
                <li>በሕጋዊ ጥቅም ላይ የተመሠረተ የመረጃ ሂደትን መገደብ ወይም መቃወም።</li>
                <li>በሕግ የሚጠየቅ የመረጃ መስጠት ሲኖር ማሳወቂያ ማግኘት እና ሕጉ በሚፈቅድበት ጊዜ መቃወም።</li>
                <li>ሥልጣን ላለው የኢትዮጵያ የመረጃ ጥበቃ ባለሥልጣን ቅሬታ ማቅረብ።</li>
              </ul>
              <p>
                YeKis በሕግ መቆየት ያለባቸውን የፋይናንስ ወይም የማንነት መዝገቦች መሰረዝ አይችልም፤ እንዲሁም
                ገንዘብ በሂደት ላይ እያለ፣ ውል ንቁ ሆኖ ሳለ ወይም ክርክር ክፍት ሆኖ ሳለ መዝገቦችን መሰረዝ
                አይችልም። በእነዚህ ሁኔታዎች መጀመሪያ መፈታት ያለባቸው ነጥቦች ተዘርዝረው ጥያቄው ውድቅ ይደረጋል።
              </p>
            </>
          ),
        },
        {
          id: "exercise-rights",
          title: "መብቶችዎን እንዴት መጠቀም እንደሚችሉ",
          content: (
            <>
              <p>
                የገቡ ተጠቃሚዎች ከመለያ ቅንብሮች መረጃቸውን ወደ ውጭ መላክ (Export) እና መለያ እንዲሰረዝ
                መጠየቅ ይችላሉ። Export መለያን፣ መገለጫን፣ ማረጋገጫን፣ ፋይናንስን፣ የገበያ ቦታን፣ ግንኙነቶችን፣
                ስምምነቶችን እና የሕግ ተገዢነት መዝገቦችን ያካትታል። ስረዛ ሌላ ሰው ያለእርስዎ ፈቃድ መለያዎን
                እንዳይዘጋ ትኩስ ማረጋገጫ ይጠይቃል።
              </p>
              <p>
                ለማስተካከያ፣ ለመገደብ፣ ለመቃወም፣ ለቅሬታ ወይም ለሌላ ማንኛውም የግላዊነት ጥያቄ{" "}
                <a href="mailto:privacy@yekis.com">privacy@yekis.com</a> ላይ ኢሜይል ያድርጉ። መለያውን እና
                ጥያቄውን ለመለየት በቂ ዝርዝር ያካትቱ። ከመተግበራችን በፊት ማረጋገጫ ልንጠይቅ እንችላለን። YeKis
                ጥያቄዎን በፍጥነት ለመመለስ እና ሕጋዊ ልዩ ሁኔታ ካለ ለማብራራት ይጥራል።
              </p>
            </>
          ),
        },
        {
          id: "automated-processing",
          title: "አውቶማቲክ ፍተሻዎች እና የሰው ግምገማ",
          content: (
            <>
              <p>
                YeKis ያልተለመዱ የግብይት ንድፎችን፣ ተደጋጋሚ ወይም አጭበርባሪ መለያዎችን፣ ያልተሟላ ማረጋገጫን፣
                የደህንነት መዛባቶችን እና ውሎችን ሊጥሱ የሚችሉ ይዘቶችን ለመለየት ደንቦችን ይጠቀማል። እነዚህ
                ደንቦች አንድን መለያ፣ ክፍያ ወይም ዝርዝር ለግምገማ ሊያስቀምጡ ይችላሉ። የመጨረሻ የሕግ ተገዢነት፣
                የKYC እና የክርክር ውሳኔዎች የሚወሰዱት ሥልጣን ባላቸው ሰዎች በተቆጣጠረ የሥራ ፍሰት ሲሆን በኦዲት
                መዝገብ ውስጥ ይመዘገባሉ።
              </p>
              <p>
                ውሳኔውን ለማድረግ ጥቅም ላይ የዋለውን መረጃ መጠየቅ፣ የሰው ግምገማ መጠየቅ ወይም የሚመለከተው ሕግ
                ይህን መብት በሚሰጥበት ቦታ ውጤቱን መቃወም ይችላሉ።
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "ህጻናት እና ዝቅተኛው ዕድሜ",
          content: (
            <p>
              YeKis ለህጻናት የታሰበ አይደለም። መለያ ለመፍጠር ወይም የገበያ ቦታውን ለመጠቀም ቢያንስ 18 ዓመት
              የሞላዎት እና በሕግ አስገዳጅ ውል መፈረም የሚችሉ መሆን አለብዎት። ሆን ብለን ከህጻናት በቀጥታ የግል
              መረጃ አንሰበስብም። አንድ ህጻን መረጃ እንደሰጠን ካመኑ አስፈላጊ በሚሆንበት ጊዜ እንድንመረምረው እና
              እንድናስወግደው ወዲያውኑ ያግኙን።
            </p>
          ),
        },
        {
          id: "changes",
          title: "የዚህ ፖሊሲ ለውጦች",
          content: (
            <p>
              አገልግሎቱ፣ አሰራራችን ወይም ሕጉ ሲለወጥ YeKis ይህን ፖሊሲ ሊያዘምን ይችላል። ከዚህ ገጽ አናት ላይ
              ያለው የሚፀናበት ቀን እና እትም የአሁኑን እትም ያሳያል። ለውጡ መብቶችዎን በከፍተኛ ሁኔታ ሲነካ
              በአገልግሎቱ ወይም በኢሜይል ተጨማሪ ማሳወቂያ እንሰጣለን። ሕጉ አዲስ ስምምነትን ካልጠየቀ በስተቀር
              ከማሳወቂያው በኋላ YeKisን መጠቀምዎን መቀጠል የተሻሻለው ፖሊሲ ከሚፀናበት ቀን ጀምሮ ተፈጻሚ ይሆናል ማለት ነው።
            </p>
          ),
        },
        {
          id: "contact",
          title: "መገኛ አድራሻ እና ቅሬታዎች",
          content: (
            <>
              <p>
                YeKis መቀመጫውን በአዲስ አበባ፣ ኢትዮጵያ ያደረገ ነው። የግላዊነት ጥያቄዎችን ወደ{" "}
                <a href="mailto:privacy@yekis.com">privacy@yekis.com</a> ይላኩ። ለአጠቃላይ የመለያ
                ወይም የገበያ ቦታ ድጋፍ <a href="mailto:support@yekis.com">support@yekis.com</a> ላይ ኢሜይል ያድርጉ።
              </p>
              <p>
                በምላሻችን ካልረኩ፣ ጉዳዩ ወደ ግላዊነት ኃላፊያችን እንዲተላለፍ መጠየቅ ወይም ሥልጣን ላለው
                የኢትዮጵያ የመረጃ ጥበቃ ባለሥልጣን ቅሬታ ማቅረብ ይችላሉ። በቅን ልቦና የግላዊነት ጥያቄ ወይም
                ቅሬታ በማቅረብዎ ምክንያት ምንም ዓይነት የበቀል እርምጃ አንወስድብዎትም።
              </p>
            </>
          ),
        },
      ],
    };
  }

  if (language === "om") {
    return {
      effectiveDate: "13 Sadaasa 2026",
      eyebrow: "Seeraa fi Amanamummaa",
      title: "Imaammata Mateenyaa (Privacy)",
      summary:
        "Akkaataa YeKis daataa eenyummaa, gabaa hojii, kaffaltii, quunnamtii fi nageenyaa itti qabatu, akkasumas filannoowwanii fi mirgoota odeeffannoo sana irratti qabdan ibsa.",
      sections: [
        {
          id: "scope",
          title: "Eenyu akka taanee fi wanta imaammanni kun hammatu",
          content: (
            <>
              <p>
                YeKis waltajjii hojii bilisaa (freelance marketplace) Itoophiyaa kan Finfinnee,
                Itoophiyaa irraa hojjetudha. Imaammanni Mateenyaa kun yeroo marsariitii YeKis
                dawwattan, herrega uumattan, bakka hojii weebii ykn Telegram Mini App fayyadamtan,
                garee deeggarsaa waliin haasoftan, hojii maxxansitan, yaada dhiyeessitan,
                waliigaltee seenan, ykn kaffaltii boqonnaa kaffaltanii fi fudhattan akkaataa YeKis
                odeeffannoo dhuunfaa itti funaanu, fayyadamu, qoodu, tursiisuu fi eegu ibsa.
              </p>
              <p>
                YeKis odeeffannoo dhuunfaa tajaajiloota kanneen keessatti qophaa'uuf to'ataa daataa
                (Data Controller) dha. Qaamoleen gabaa keessaa walquunnamanis odeeffannoo walii
                kennan irratti (fkn teessoo hojii maamilaa ogeessa qacarameef mul'atu) of
                danda'anii itti gaafatamummaa qabu.
              </p>
            </>
          ),
        },
        {
          id: "information-we-collect",
          title: "Odeeffannoo nuti funaannu",
          content: (
            <>
              <p>Odeeffannoo gabaa kana hojjechiisuu, eeguu fi fooyyessuuf barbaachisu qofa funaanna.</p>
              <ul>
                <li>
                  <strong>Odeeffannoo herregaa fi mirkaneessaa:</strong> maqaa duraa fi akaakayyuu,
                  maqaa mul'atu, teessoo imeelii, lakkoofsa bilbilaa, guyyaa dhalootaa, gahee,
                  filannoo afaanii fi sa'aatii, haashii jecha icciitii, eenyummeessaa Google ykn
                  Telegram, haala mirkaneessaa fi yeroo uumama herregaa.
                </li>
                <li>
                  <strong>Odeeffannoo piroofaayilii fi gabaa:</strong> seenaa gabaabaa, suuraa,
                  dandeettiiwwan, faayiloota poortifooliyoo, qophii hojii, ibsa hojii, yaadota
                  dorgommii (proposals), xalayaa haguuggii, deebii gaaffii, tarree giigii (Gigs),
                  waliigaltee, ibsa boqonnaa, faayiloota dhiyeessii, ergaawwan, fi yaadannoo madaallii.
                </li>
                <li>
                  <strong>Odeeffannoo eenyummaa fi seeraa:</strong> sadarkaa mirkaneessaa, UCID,
                  eenyummeessaa baayoomeetirikii Fayda, sanadoota eenyummaa, suuraa ofii (Selfie)
                  yeroo mirkaneessaa dhiyaatu, galmee hayyamaa, murtoowwan madaallii fi galmee
                  hordoffii maallaqaa seeraan barbaadamu.
                </li>
                <li>
                  <strong>Odeeffannoo faayinaansii fi kaffaltii:</strong> hafeensa wallet, hanga ETB,
                  haala kaffaltii, ragaa tajaajila kaffaltii, baasii fi bakka kaffaltii, galmee
                  leejarii, kaffaltii waltajjii, gibira seeraan hir'ifamu fi oodiitii maallaqaa.
                  YeKis ragaa kaardii baankii guutuu hin kuusu.
                </li>
                <li>
                  <strong>Quunnamtii:</strong> haasawa deeggarsaa, ergaa kallattii, ragaalee falmii,
                  beeksisa, galmee imeelii fi SMS, ergaa Telegram fi filannoowwan hayyama keessanii.
                </li>
                <li>
                  <strong>Odeeffannoo teeknikaa fi nageenyaa:</strong> teessoo IP, odeeffannoo
                  meeshaa fi biraawuzarii, taateewwan seenumsaa fi nageenyaa, yeroo fi galmee dogoggoraa.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "sensitive-information",
          title: "Odeeffannoo eenyummaa fi faayinaansii iccitaawaa",
          content: (
            <>
              <p>
                Odeeffannoon tokko tokko kan akka sanada eenyummaa, ragaalee baayoomeetirikii,
                guyyaa dhalootaa, galmee faayinaansii fi ragaa falmii yoo saaxilaman miidhaa guddaa
                fiduu danda'u. YeKis odeeffannoo kana kan qopheessu kaayyoo itti dhiyaateef qofa:
                mirkaneessa eenyummaa, ittisa gowwoomsaa, raawwii kaffaltii, bulchiinsa waliigaltee,
                furmaata falmii fi guutuu dirqama seeraa.
              </p>
              <p>
                Odeeffannoo iccitaawaa hin barbaachisne ibsa hojii, yaada dorgommii, ergaa ykn
                poortifooliyoo keessa hin kaa'inaa. Argamni sanadoota KYC fi faayinaansii gahee
                hojjetaatiin kan daangeffamee fi oodiitii keessatti kan galmaa'udha.
              </p>
            </>
          ),
        },
        {
          id: "how-we-use",
          title: "Maaliif odeeffannoo keessan fayyadamna",
          content: (
            <ul>
              <li>Herrega keessan uumuu, eeguu, mirkaneessuu fi deebisanii argachuu.</li>
              <li>Eenyummaa mirkaneessuu, gowwoomsaa qulqulleessuu, seera gabaa kabachiisuu fi seera farra maallaqa seeraan alaa (AML) hojiirra oolchuu.</li>
              <li>Piroofaayilii, poortifooliyoo, giigii, yaada hojii fi madaallii akka mul'atan filattan maxxansuu.</li>
              <li>Maamiltootaa fi ogeeyyii walqunnamsiisuu, waliigaltee uumuu, boqonnaa hojii bulchuu fi kaffaltii herreguu.</li>
              <li>Beeksisa tajaajilaa, dhiyeessii, kaffaltii fi nageenyaa isin gaafattan erguu.</li>
              <li>Deeggarsa kennuu, falmii hiikuu, waliigaltee raawwachiisuu fi galmee gabaa eeguu.</li>
              <li>YeKis, fayyadamtootaa fi hawaasa gowwoomsaa, miidhaa fi gocha seeraan alaa irraa eeguu.</li>
              <li>Yeroo isin xiinxala (Analytics) hayyamtan itti fayyadama waliigalaa hubachuunii fi tajaajila fooyyessuu.</li>
              <li>Dirqama gibiraa, to'annoo, oodiitii fi seeraa guutuu.</li>
            </ul>
          ),
        },
        {
          id: "legal-bases",
          title: "Bu'uura seeraa odeeffannoo qopheessuuf qabnu",
          content: (
            <>
              <p>
                Akkaataa hojiichaatiin, YeKis Labsii Eegumsa Daataa Dhuunfaa Lakk. 1321/2024 dabalatee
                seera hojjetu jalatti bu'uuraalee seeraa armaan gadii irratti hundaa'a:
              </p>
              <ul>
                <li><strong>Raawwii waliigaltee:</strong> yeroo tajaajila isin gaafattan kan akka herregaa, waliigaltee, boqonnaa fi kaffaltii kennuuf barbaachisu.</li>
                <li><strong>Dirqama seeraa:</strong> yeroo seerri eenyummaa, AML, gibiraa ykn oodiitii odeeffannoo akka qopheessinu ykn tursiisnu nu dirqisiisu.</li>
                <li><strong>Faayidaa seera-qabeessa:</strong> mirgoota keessan waliin madaaluudhaan nageenyaa fi itti fufiinsa gabaa eeguuf yeroo barbaachisu.</li>
                <li><strong>Hayyama (Consent):</strong> xiinxala filannoo fi ergaa beeksisaatiif, akkasumas bakka seerri hayyama addaa gaafatutti.</li>
              </ul>
              <p>
                Qindaa'ina herregaa keessaan ykn nu quunnamuun yeroo barbaaddanitti hayyama keessan
                haquu ni dandeessu. Kunis hojii seera-qabeessa kanaan dura raawwatame hin miidhu.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "Yoom odeeffannoo qoodna",
          content: (
            <>
              <p>YeKis daataa dhuunfaa hin gurguru. Kaayyoowwan imaammata kana keessatti ibsaman qofaaf qoodna:</p>
              <ul>
                <li><strong>Fayyadamtoota gabaa biroo:</strong> piroofaayilii keessan mul'isuu, waliin dubbachuu, waliigaltee fi boqonnaa hojii bulchuu fi odeeffannoo eenyummaa daldalaaf barbaachisu agarsiisuu.</li>
                <li><strong>Dhiyeessitoota tajaajilaa:</strong> tajaajiloota hoostingii, kuusaa daataa, Redis, imeelii, SMS, hordoffii fi deeggarsaa kanneen ajaja YeKis jalatti hojjetan.</li>
                <li><strong>Dhiyeessitoota kaffaltii:</strong> Telebirr fi baankota kaffaltii mirkaneessuu, maallaqa iskuuroo qabuu ykn gadhiisuu fi baasii raawwachiisuuf qophaa'an.</li>
                <li><strong>Dhiyeessitoota eenyummaa:</strong> mirkaneessaaf eSignet ykn Fayda, seenumsaaf Google, fi Telegram Mini App.</li>
                <li><strong>Dhiyeessitoota xiinxalaa hayyamtan:</strong> Google Analytics kan fe'amu erga kuukii xiinxalaa hayyamtanii qofadha.</li>
                <li><strong>Gorsitoota ogummaa fi abbootii aangoo:</strong> yeroo seeraan gaafatamu ykn waltajjii fi fayyadamtoota eeguuf barbaachisu oodiitaroota, abukaatota, manneen murtii fi qaamolee seeraa.</li>
                <li><strong>Jijjiirama daldalaa:</strong> yeroo walitti makamuu ykn gurgurtaa dhaabbataa eegumsa icciitii cimaa waliin.</li>
              </ul>
            </>
          ),
        },
        {
          id: "international-transfers",
          title: "Kuusaa fi dabarsa biyya alaa",
          content: (
            <>
              <p>
                YeKis appilikeeshinii isaa, kuusaa daataa fi faayilaa Itoophiyaa keessatti akka
                qabatuutti kan qophaa'edha. Haa ta'u malee, biyya biraa irraa fayyadamuun,
                tajaajila eenyummaa ykn quunnamtii addunyaa fayyadamuun, ykn deeggarsi biyya alaa
                irraa kennamu dabarsa daangaa ce'aa ta'uu danda'a.
              </p>
              <p>
                Bakka dabarsi barbaachisutti YeKis eegumsa seerri gaafatu hunda ni fayyadama.
                Odeeffannoo dabalataaf nu quunnamaa.
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "Akkaataa odeeffannoo itti eegnu",
          content: (
            <>
              <p>YeKis tarkaanfiiwwan teeknikaa fi bulchiinsaa madaalawaa hojiirra oolcha:</p>
              <ul>
                <li>Haashingii jecha icciitii Argon2id fi tookanoota yeroodhaaf turan.</li>
                <li>HTTPS tiraafikaa oomishaatiif, mata-duree nageenyaa, Content Security Policy, daangeffama saffisaa fi mirkaneessa gaaffii cimaa.</li>
                <li>Argama galmeewwan eenyummaa, faayinaansii, deeggarsaa fi falmii gahee irratti hundaa'e.</li>
                <li>Kuusaa faayilaa daangeffamaa fi liinkiiwwan mallattaa'an yeroo gabaabaaf tajaajilan.</li>
                <li>Galmee oodiitii hin haqamne jijjiiramoota gurguddoo faayinaansii fi nageenyaatiif.</li>
                <li>To'annoo balaa sochii hin baratamne qorannoo namaatiif adda baasu.</li>
              </ul>
              <p>
                Tajaajilli intarneetii kamiyyuu nageenya guutuu %100 wabii hin kennu. Yoo balaan
                daataa mudate, YeKis dafee to'ata, seshiinoota miidhaman haqa, fayyadamtootaa fi
                abbootii aangoo yeroo seeraan kaa'ame keessatti beeksisa.
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "Yeroo hammamiif odeeffannoo tursiisna",
          content: (
            <>
              <p>
                YeKis odeeffannoo dhuunfaa kan tursiisu kaayyoo itti funaanameef, tajaajila kennuu,
                falmii furuu fi dirqama seeraa raawwachuuf hanga barbaachisutti qofadha:
              </p>
              <ul>
                <li><strong>Herrega hojjechaa jiru:</strong> hanga herregichi banaa ta'ee fi hojiiwwan eegalaman raawwachuuf barbaachisutti.</li>
                <li><strong>Galmeewwan eenyummaa, KYC, faayinaansii, hayyamaa, falmii fi oodiitii:</strong> bakka seerri gaafatu hundaatti waliigalaan hanga waggaa kudhanii (10).</li>
                <li><strong>Haasawa deeggarsaa fi ragaa falmii:</strong> hanga dhimmi sun cufamuutti fi mirga seeraa falmuuf barbaachisutti.</li>
                <li><strong>Galmee nageenyaa fi teeknikaa:</strong> haalota qorachuu fi seera kabachiisuuf hanga barbaachisutti.</li>
                <li><strong>Seenaa hayyamaa:</strong> ragaa wanta itti waliigaltanii fi yeroo isaa ta'ee tursiifama.</li>
              </ul>
              <p>
                Yeroo haqamuu (Erasure) gaafattan, YeKis piroofaayilii, jecha icciitii, suuraalee
                dhuunfaa, ergaawwan isin barreessitan, poortifooliyoo, dandeettiiwwan fi xiinxala
                ni balleessa. Garuu galmeewwan seerri akka eegnu gaafatu (KYC, wallet, daldala,
                oodiitii, waliigaltee fi madaallii) yeroo seeraan kaa'ameef ni turu.
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Kuukiiwwan, kuusaa biraawuzarii fi xiinxala",
          content: (
            <>
              <p>
                YeKis kuusaa biraawuzarii kan fayyadamu tajaajiloota isa malee hin hojjenneefidha:
                tookanoota eenyummaa, filannoo bifa (theme) fi afaanii, hayyamaa fi haala deebii
                kaffaltii yeroodhaa. Kuusaan bu'uuraa kun nageenyaaf waan barbaachisuuf hin cufamu.
              </p>
              <p>
                Xiinxalli filannoo (Google Analytics) kan hojjetu oomisha keessatti yeroo hayyama
                kuukii xiinxalaa fudhattan qofadha. Imeelii, bilbila, maqaa ykn hanga kaffaltii
                dhuunfaa hin hammatu. Baanaricha irratti diduu ykn booda jijjiiruu dandeessu.
              </p>
            </>
          ),
        },
        {
          id: "your-rights",
          title: "Mirgoota mateenyaa keessanii",
          content: (
            <>
              <p>Seera hojjetu jalatti mirgoota kana qabaachuu dandeessu:</p>
              <ul>
                <li>Odeeffannoo dhuunfaa YeKis waa'ee keessan qabu beekuu fi kooppii argachuu.</li>
                <li>Daataa sana bifa kompiitaraan dubbifamutti argachuu.</li>
                <li>Odeeffannoo dogoggoraa ykn hin guutamne sirreessisuu.</li>
                <li>Dirqamni seeraa tursiisuu yoo hin jiraanne akka haqamu gaafachuu.</li>
                <li>Hayyama keessan kaasanii xiinxala ykn beeksisa dhaabsisuu.</li>
                <li>Qophii daataa faayidaa seera-qabeessa irratti hundaa'e mormuu ykn daangessuu.</li>
                <li>Biyya keessatti Abbaa Taayitaa Eegumsa Daataa Itoophiyaatti komii dhiyeessuu.</li>
              </ul>
              <p>
                YeKis galmeewwan faayinaansii ykn eenyummaa seeraan eegamuu qaban haquu hin danda'u;
                akkasumas yeroo maallaqni sochii irra jiru, waliigalteen hojjechaa jiru ykn falmiin
                banaa ta'etti haquun hin danda'amu.
              </p>
            </>
          ),
        },
        {
          id: "exercise-rights",
          title: "Mirgoota keessan akkamitti fayyadamtu",
          content: (
            <>
              <p>
                Fayyadamtoonni seenan qindaa'ina herregaa keessaa daataa isaanii baafachuu (Export)
                fi cufamuu herregaa gaafachuu danda'u. Haquun eenyummaa namni biraa herrega keessan
                akka hin cufneef mirkaneessa haaraa gaafata.
              </p>
              <p>
                Sirreeffama, daangeffama, mormii ykn komii mateenyaa kamiyyuuf{" "}
                <a href="mailto:privacy@yekis.com">privacy@yekis.com</a> irratti barreessaa. YeKis
                hatattamaan deebii kennuuf carraaqa.
              </p>
            </>
          ),
        },
        {
          id: "automated-processing",
          title: "Qorannoo ofumaa fi ilaalcha namaa",
          content: (
            <>
              <p>
                YeKis sochii maallaqaa hin baratamne, herrega dachaa ykn gowwoomsaa, mirkaneessa hin
                xumuramne fi balaa nageenyaa adda baasuuf seerota ofumaa fayyadama. Murtoowwan
                dhumaa KYC, seeraa fi falmii kan kennaman hojjettoota hayyama qabaniin ta'ee galmee
                oodiitii keessatti kaa'ama.
              </p>
              <p>
                Odeeffannoo murtoof oole gaafachuu, ilaalcha namaa gaafachuu ykn murtoo mormuu ni dandeessu.
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "Daa'immanii fi umrii xiqqaa",
          content: (
            <p>
              YeKis daa'immaniif hin qophoofne. Herrega uumuu ykn gabaa fayyadamuuf yoo xiqqaate umriin
              keessan waggaa 18 ta'uu fi seeraan waliigaltee seenuu kan dandeessan ta'uu qaba. Yoo
              daa'imni daataa kenneera jettanii yaaddan hatattamaan nu quunnamaa.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Jijjiirama imaammata kanaa",
          content: (
            <p>
              YeKis yeroo tajaajilli ykn seerri jijjiiramu imaammata kana fooyyessuu danda'a. Guyyaan
              hojiirra ooluu fi gulaalliin mataa fuula kanaa irratti mul'ata. Jijjiirama guddaaf
              imeeliin ykn waltajjii keessaan beeksisa ni kennina.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Quunnamtii fi komii",
          content: (
            <>
              <p>
                YeKis Finfinnee, Itoophiyaa keessatti hundeeffame. Gaaffii mateenyaaf{" "}
                <a href="mailto:privacy@yekis.com">privacy@yekis.com</a> irratti barreessaa.
                Deeggarsa herregaaf immoo <a href="mailto:support@yekis.com">support@yekis.com</a> fayyadamaa.
              </p>
              <p>
                Deebii keenyaan yoo hin quufne qaama ol'aanaa mateenyaa keenyaatti dhiyeessuu ykn
                Abbaa Taayitaa Eegumsa Daataa Itoophiyaatti iyyachuu dandeessu. Gaaffii gaarii
                dhiyeessuu keessaniin haaloo hin baanu.
              </p>
            </>
          ),
        },
      ],
    };
  }

  if (language === "ti") {
    return {
      effectiveDate: "13 ሕዳር 2026",
      eyebrow: "ሕግን እምነትን",
      title: "ፖሊሲ ብሕትውና (Privacy Policy)",
      summary:
        "YeKis ናይ መንነት፣ ዕዳጋ፣ ክፍሊት፣ ርክብን ድሕነትን ዳታ ከመይ ከም ዝሕዝን ኣብ ልዕሊ እቲ ሓበሬታ ዘለኩም ምርጫን መሰላትን የብርህ።",
      sections: [
        {
          id: "scope",
          title: "መን ኢናን እዚ ፖሊሲ እንታይ ይሽፍንን",
          content: (
            <>
              <p>
                YeKis መደበሩ ኣብ ኣዲስ ኣበባ፣ ኢትዮጵያ ዝኾነ ናይ ኢትዮጵያ ፍሪላንስ ዕዳጋ ስራሕ እዩ። እዚ
                ፖሊሲ ብሕትውና መርበብ ሓበሬታ YeKis ክትበጽሑ፣ ኣካውንት ክትከፍቱ፣ ናይ ዌብ መድረኽ ወይ
                Telegram Mini App ክትጥቀሙ፣ ምስ ጉጅለ ደገፍ ክትራኸቡ፣ ስራሕ ክትውስኹ፣ ፕሮፖዛል ክትልእኹ፣
                ውዕል ክትኣስሩ፣ ክፍሊት ምዕራፍ ክትከፍሉ ወይ ክትቅበሉ ከለኹም ውልቃዊ ሓበሬታኹም ከመይ ከም
                ንእክብ፣ ንጥቀም፣ ነካፍል፣ ንዕቅብን ንሕሉን የብርህ።
              </p>
              <p>
                YeKis በዞም ኣገልግሎታት ዝሰላሰል ውልቃዊ ሓበሬታ ተቆጻጻሪ ዳታ (Data Controller) እዩ።
                ተወዓዓልቲ ወገናት ዕዳጋ እውን ንሓደ ስራሕ ንሓድሕዶም ንዝልውጥዎ ሓበሬታ (ከም መራኸቢ ንግዲ
                ዓሚል ንዝተቖጽረ ክኢላ ዝረአ) ነብሶም ዝኸኣሉ ተቆጻጸርቲ እዮም።
              </p>
            </>
          ),
        },
        {
          id: "information-we-collect",
          title: "ንእክቦ ሓበሬታ",
          content: (
            <>
              <p>ዕዳጋ ንምክያድ፣ ንምሕላውን ንምምሕያሽን ዘድሊ ሓበሬታ ጥራይ ንእክብ።</p>
              <ul>
                <li>
                  <strong>ሓበሬታ ኣካውንትን መረጋገጽን፡</strong> ቀዳማይን ናይ ኣቦን ስም፣ ዝረአ ስም፣ ኢሜይል፣
                  ቁጽሪ ስልኪ፣ ዕለተ ልደት፣ ግደ፣ ምርጫ ቋንቋን ሰዓትን፣ ሃሽ መሕለፊ ቃል፣ መለለዪ Google ወይ
                  Telegram፣ ኩነታት መረጋገጽን ግዜ ምምዝጋብን።
                </li>
                <li>
                  <strong>ሓበሬታ ፕሮፋይልን ዕዳጋን፡</strong> መግለጺ፣ ስእሊ፣ ክእለታት፣ ፋይላት ፖርትፎልዮ፣
                  ድሉውነት ስራሕ፣ መግለጺታት ስራሕ፣ ፕሮፖዛላት፣ መልስታት ሕቶ፣ ዝርዝር ጊግ (Gigs)፣ ውዕላት፣
                  ምዕራፋት፣ ዝተረከቡ ፋይላት፣ መልእኽትታት፣ ግምገማታትን ምንቅስቓስን።
                </li>
                <li>
                  <strong>ሓበሬታ መንነትን ሕጋዊ ምኽባርን፡</strong> ደረጃ መረጋገጺ፣ UCID፣ ባዮሜትሪክ መለለዪ
                  ፋይዳ፣ ሰነዳት መንነት፣ ሰልፊ (Selfie) ወይ ስእሊ መረጋገጺ፣ መዛግብቲ ስምምዕ፣ ውሳነታት
                  ግምገማን ብሕጊ ዝሕተት መዛግብቲ ክትትልን።
                </li>
                <li>
                  <strong>ሓበሬታ ፋይናንስን ክፍሊትን፡</strong> ሚዛን ዋሌት፣ መጠን ብር (ETB)፣ ኩነታት
                  ክፍሊት፣ መወከሲ ትራንዛክሽን፣ መውጽኢ ገንዘብን መዓርፎታትን፣ መዛግብቲ ሌጀር፣ ክፍሊት መድረኽ፣
                  ሕጋዊ ዝተሓዝ ግብርን መዛግብቲ ኦዲትን። YeKis ሙሉእ ሓበሬታ ካርድ ክፍሊት ኣይዕቅብን።
                </li>
                <li>
                  <strong>ርክባት፡</strong> ዝርርባት ደገፍ፣ ቀጥታዊ መልእኽትታት፣ መርትዖን መግለጽን ክትዕ፣
                  መፍለጥታት፣ መዛግብቲ ኢሜይልን SMSን፣ መልእኽትታት ቴሌግራምን ምርጫታት ስምምዕን።
                </li>
                <li>
                  <strong>ቴክኒካውን ድሕነትን ሓበሬታ፡</strong> ኣድራሻ IP፣ ሓበሬታ መሳርሕን ብራውዘርን፣
                  መለለዪ ሕቶታት፣ ፍጻመታት መእተውን ድሕነትን፣ ሰዓትን መዛግብቲ ጌጋን።
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "sensitive-information",
          title: "ጥንቃቐ ዘድልዮም ሓበሬታ መንነትን ፋይናንስን",
          content: (
            <>
              <p>
                ገለ ኣብ ዕዳጋ ስራሕ ዝጥቀም ሓበሬታ ከም ሰነዳት መንነት፣ ባዮሜትሪክ መለለዪ፣ ዕለተ ልደት፣
                መዛግብቲ ፋይናንስን መርትዖ ክትዕን እንተተቓሊዖም ከቢድ ጉድኣት ከስዕቡ ይኽእሉ። YeKis ነዞም
                ሓበሬታታት ዝጥቀመሎም ንስኻትኩም ንዘቕረብኩምዎ ዕላማ ጥራይ እዩ፤ ማለት መረጋገጺ መንነት፣
                ምክልኻል ምትላል፣ ምፍጻም ክፍሊት፣ ምምሕዳር ውዕል፣ ምፍታሕ ክትዕን ምኽባር ሕግን።
              </p>
              <p>
                ዘየድሊ ጥንቃቐ ዘድልዮ ሓበሬታ ኣብ መግለጺ ስራሕ፣ ፕሮፖዛል፣ መልእኽቲ ወይ ፖርትፎልዮ ኣይተእትዉ።
                ናብ ሰነዳት KYCን ፋይናንስን ምእታው ብግደ ሰራሕተኛ ዝተገደበን ኣብ መዝገብ ኦዲት ዝምዝገብን እዩ።
              </p>
            </>
          ),
        },
        {
          id: "how-we-use",
          title: "ሓበሬታኹም ስለምንታይ ንጥቀመሉ",
          content: (
            <ul>
              <li>ኣካውንትኩም ንምፍጣርን ንምሕላውን፣ መንነትኩም ንምርግጋጽን መእተዊ ንምምላስን።</li>
              <li>መንነት ንምርግጋጽ፣ ምትላል ንምምርማር፣ ሕግታት ዕዳጋ ንምኽባርን ሕግታት ጸረ-ምሕጻብ ገንዘብ ንምፍጻምን።</li>
              <li>ንኻልኦት ክረአ ዝመረጽኩምዎ ፕሮፋይል፣ ፖርትፎልዮ፣ ዝርዝራት፣ ፕሮፖዛላትን ግምገማታትን ንምሕታም።</li>
              <li>ዓማዊልን ክኢላታትን ንምርኻብ፣ ውዕላት ንምፍጣር፣ ምዕራፋት ንምምሕዳርን ክፍሊት ንምስላዕን።</li>
              <li>ዝሓተትኩምዎ መፍለጥታት ኣገልግሎት፣ ርክክብ፣ ክፍሊት፣ ድሕነትን ኣካውንትን ንምልኣኽ።</li>
              <li>ደገፍ ንምሃብ፣ ክትዓት ንምፍታሕ፣ ውዕላት ንምትግባርን መዝገብ ዕዳጋ ንምሕላውን።</li>
              <li>ንYeKis፣ ተጠቀምቱን ህዝብን ካብ ምትላል፣ ስፓምን ዘይሕጋዊ ተግባርን ንምክልኻል።</li>
              <li>ትንተና (Analytics) ምስ ፈቐድኩም ኣጠቓቕማ መድረኽ ንምርዳእን ንምምሕያሽን።</li>
              <li>ግቡኣት ግብሪ፣ ቁጽጽር፣ ኦዲትን ካልኦት ሕጋዊ ግዴታታትን ንምምላእ።</li>
            </ul>
          ),
        },
        {
          id: "legal-bases",
          title: "ዳታ ንምስራሕ ዘለና ሕጋዊ መሰረት",
          content: (
            <>
              <p>
                ብመሰረት ዓይነት ስራሕ፣ YeKis ኣዋጅ ሓለዋ ውልቃዊ ዳታ ቁጽሪ 1321/2024 ሓዊሱ ብዝምልከቶም
                ሕግታት ኣብ ሓደ ወይ ልዕሊኡ ካብዞም ሕጋዊ መሰረታት ይምርኮስ፡
              </p>
              <ul>
                <li><strong>ኣፈጻጽማ ውዕል፡</strong> ከም ኣካውንት፣ ውዕላት፣ ምዕራፋትን ክፍሊታትን ዝበሉ ዝሓተትኩምዎ ኣገልግሎት ንምሃብ ዘድሊ ምስ ዝኸውን።</li>
                <li><strong>ሕጋዊ ግዴታ፡</strong> ሕጊ መንነት፣ ጸረ-ምሕጻብ ገንዘብ፣ ግብሪ፣ ኦዲት ወይ ምዕቃብ መዝገብ ከነስርሕ ወይ ክንዕቅብ ምስ ዘገድደና።</li>
                <li><strong>ሕጋዊ ረብሓ፡</strong> ምስ መሰላትኩም ብምምዝዛን ንደሕንነት፣ ምክልኻል ምትላልን ምምሕያሽ ኣገልግሎትን ኣድላዪ ምስ ዝኸውን።</li>
                <li><strong>ስምምዕ (Consent)፡</strong> ንኣማራጺ ትንተናን ናይ ዕዳጋ መልእኽትታትን፣ ከምኡውን ሕጊ ብፍሉይ ስምምዕ ኣብ ዝሓተሉ እዋን።</li>
              </ul>
              <p>
                ብመንገዲ ቅጥዒ ኣካውንት ወይ ብምርኻብ ኣብ ዝኾነ እዋን ስምምዕኩም ክትስሕቡ ትኽእሉ። ምስሓብ
                ቅድሚኡ ብሕጋዊ መንገዲ ዝተፈጸመ ኣሰራርሓ ኣይጸሉን።
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "ሓበሬታ መዓስ ነካፍል",
          content: (
            <>
              <p>YeKis ውልቃዊ ዳታ ኣይሸይጥን። ሓበሬታ ንምክፋል ኣብዚ ፖሊሲ ንዝተገለጹ ዕላማታት ጥራይ እዩ፡</p>
              <ul>
                <li><strong>ካልኦት ተጠቀምቲ ዕዳጋ፡</strong> ፕሮፋይልኩም ንምርኣይ፣ ንምዝርራብ፣ ውዕልን ምዕራፍን ንምምሕዳርን ንግብይት ዘድሊ መንነት ንምርኣይን።</li>
                <li><strong>ወሃብቲ ኣገልግሎት፡</strong> ብመምርሒ YeKis ዝሰርሑ ሆስቲንግ፣ ዳታቤዝ፣ Redis፣ ኢሜይል፣ SMS፣ ክትትልን ደገፍን ወሃብቲ።</li>
                <li><strong>ወሃብቲ ክፍሊት፡</strong> ቴሌብርን ካልኦት ክፍሊት ንምርግጋጽ፣ ኤስክሮ ንምሓዝ ወይ ንምፍናውን ገንዘብ ንምውጻእን ዝተሰርዑ ባንክታትን።</li>
                <li><strong>ወሃብቲ መንነት፡</strong> ንመረጋገጺ eSignet ወይ ፋይዳ፣ ንመእተዊ Google፣ ከምኡውን ንMini App ቴሌግራም።</li>
                <li><strong>ዝፈቐድኩምዎም ትንተና ወሃብቲ፡</strong> Google Analytics ዝጽዓን ኩኪ ትንተና ምስ ተቐበልኩም ጥራይ እዩ።</li>
                <li><strong>ሞያውያን ኣማኸርትን ሰበ-ስልጣንን፡</strong> ሕጊ ምስ ዝሓትት ወይ መድረኽን ተጠቀምትን ንምሕላው ኦዲተራት፣ ጠበቓታት፣ ኣብያተ ፍርድን ኣካላት ሕግን።</li>
                <li><strong>ግብይት ንግዲ፡</strong> ውህደት፣ ፋይናንሲንግ ወይ መሸጣ ምስ ብምስጢር ምሕላውን መፍለጥን።</li>
              </ul>
            </>
          ),
        },
        {
          id: "international-transfers",
          title: "ምዕቃብን ኣህጉራዊ ምዝውዋርን",
          content: (
            <>
              <p>
                YeKis ዋና ኣፕሊኬሽኑ፣ ዳታቤዙን መኽዘን ፋይሉን ኣብ ውሽጢ ኢትዮጵያ ንምእንጋድ ዝተነድፈ እዩ።
                ይኹን እምበር ካብ ካልእ ሃገር ምእታው፣ ዓለምለኸ ወሃቢ መንነት ወይ ርክብ ምጥቃም ወይ ካብ
                ኢትዮጵያ ወጻኢ ዝግበር ደገፍ ከም ኣህጉራዊ ምዝውዋር ክቑጸር ይኽእል።
              </p>
              <p>
                ምዝውዋር ኣድላዪ ኣብ ዝኾነሉ እዋን፣ YeKis ብሕጊ ዝሕተት መከላኸሊ ይጥቀም። ንተወሳኺ
                ሓበሬታ ተወከሱና።
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "ሓበሬታ ከመይ ንሕሉ",
          content: (
            <>
              <p>YeKis ተመጣጣኒ ቴክኒካውን ውዳበኣውን መከላኸሊታት ይጥቀም፡</p>
              <ul>
                <li>Argon2id ሃሺንግ መሕለፊ ቃልን ሓጺር ዕድመ ዘለዎም ቶከናትን።</li>
                <li>ንትራፊክ HTTPS፣ ናይ ድሕነት ራእስታት፣ Content Security Policy፣ ገደብ ፍጥነትን ጽኑዕ ምርግጋጽ ሕቶን።</li>
                <li>ንመንነት፣ ፋይናንስ፣ ደገፍን ክትዕን ብግደ ዝተወሰነ መእተዊ።</li>
                <li>ንጥንቃቐ ዘድልዮም ፋይላት ዝተገደበ መኽዘንን ብግዜ ዝተደረቱ ሊንክታትን።</li>
                <li>ንዓበይቲ ለውጥታት ፋይናንስን ድሕነትን ዘይድምሰሱ መዛግብቲ ኦዲት።</li>
                <li>ዘይልሙድ ምንቅስቓስ ንገምጋም ሰብ ዝሕብሩ መቆጻጸርቲ ስግኣት።</li>
              </ul>
              <p>
                ዝኾነ ኦንላይን ኣገልግሎት 100% ፍጹም ድሕነት ክውሕስ ኣይክእልን። ጥሕሰት ድሕነት እንተጋጢሙ፣
                YeKis ብቕልጡፍ ይቆጻጸር፣ ዝተተንከፉ ሴሽናት ይስርዝን ብሕጊ ኣብ ዝተደንገገ ግዜ የፍልጥን።
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "ሓበሬታ ንኽንደይ ግዜ ንዕቅብ",
          content: (
            <>
              <p>
                YeKis ውልቃዊ ዳታ ዝዕቅቦ ንዝተኣከበሉ ዕላማ፣ ኣገልግሎት ንምሃብ፣ ክትዓት ንምፍታሕን
                ሕጋዊ ግዴታታት ንምምላእን ኣድላዪ ክሳብ ዝኾነ ጥራይ እዩ፡
              </p>
              <ul>
                <li><strong>ንጡፍ ኣካውንትን ትሕዝቶ ዕዳጋን፡</strong> ኣካውንት ንጡፍ ክሳብ ዝኾነን ውዕላት ንምፍጻም ክሳብ ዘድልን።</li>
                <li><strong>መዛግብቲ መንነት፣ KYC፣ ፋይናንስ፣ ስምምዕ፣ ክትዕን ኦዲትን፡</strong> ሕጊ ምስ ዝሓትት ብሓፈሻ ክሳብ ዓሰርተ (10) ዓመት።</li>
                <li><strong>ዝርርባት ደገፍን መርትዖ ክትዕን፡</strong> ጉዳይ ክፉት ክሳብ ዝኾነን ሕጋዊ መሰል ንምክልኻል ክሳብ ዘድልን።</li>
                <li><strong>መዛግብቲ ድሕነትን ቴክኒክን፡</strong> ፍጻመታት ንምምርማርን ኣገልግሎት ንምሕላውን ክሳብ ዘድሊ።</li>
                <li><strong>ታሪኽ ስምምዕ፡</strong> እንታይን መዓስን ከም ዝተሰማማዕኩም ከም መርትዖ ይዕቀብ።</li>
              </ul>
              <p>
                ምድምሳስ (Erasure) ምስ ሓተትኩም፣ YeKis ፕሮፋይል፣ መሕለፊ ቃላት፣ ውልቃዊ ሚድያ፣
                ዝጸሓፍኩምዎ ቻት፣ ፖርትፎልዮ፣ ክእለታትን ትንተናን የጥፍእ። ብሕጊ ክዕቀቡ ዘለዎም
                መዛግብቲ (KYC፣ ዋሌት፣ ግብይት፣ ኦዲት፣ ውዕልን ግምገማን) ግን ንዝተደንገገ ግዜ ይጸንሑ።
              </p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "ኩኪታት፣ መኽዘን ብራውዘርን ትንተናን",
          content: (
            <>
              <p>
                YeKis ብዘይ ብኡ ክሰርሑ ንዘይክእሉ ተግባራት ከም ቶከን መእተዊ፣ ምርጫ ቋንቋን ቅድን
                መኽዘን ብራውዘር ይጥቀም። ኣድላዪ መኽዘን ንደሕንነት ስለ ዘድሊ ኣይዕጾን።
              </p>
              <p>
                ኣማራጺ ትንተና (Google Analytics) ዝሰርሕ ኣብ ፕሮዳክሽን ኩኪ ትንተና ምስ ፈቐድኩም
                ጥራይ እዩ። ኢሜይል፣ ስልኪ፣ ስም ወይ ውልቃዊ መጠን ክፍሊት ኣይሕዝን።
              </p>
            </>
          ),
        },
        {
          id: "your-rights",
          title: "መሰላት ብሕትውናኹም",
          content: (
            <>
              <p>ብመሰረት ዝምልከት ሕጊ እዞም መሰላት ክህልዉኹም ይኽእሉ፡</p>
              <ul>
                <li>YeKis ብዛዕባኹም ዝሓዞ ውልቃዊ ዳታ ምፍላጥን ቅዳሕ ምርካብን።</li>
                <li>ነቲ ዳታ ብኮምፒተር ክንበብ ብዝኽእል ቅርጺ ምርካብ።</li>
                <li>ዘይቅኑዕ ወይ ዘይምሉእ ሓበሬታ ምእራም።</li>
                <li>ሕጋዊ ግዴታ ምዕቃብ እንተዘየለ ውልቃዊ ዳታ ክድምሰስ ምሕታት።</li>
                <li>ስምምዕ ምስሓብን ኣማራጺ ትንተና ወይ ማርኬቲንግ ደው ምባልን።</li>
                <li>ኣብ ሕጋዊ ረብሓ ዝተመርኮሰ ምስራሕ ምግዳብ ወይ ምቅዋም።</li>
                <li>ስልጣን ናብ ዘለዎ በዓል መዚ ሓለዋ ዳታ ኢትዮጵያ ጥርዓን ምቕራብ።</li>
              </ul>
              <p>
                YeKis ብሕጊ ክዕቀቡ ዘለዎም መዛግብቲ ፋይናንስን መንነትን ክድምስስ ኣይክእልን፤ ከምኡውን
                ገንዘብ ኣብ ምንቅስቓስ እንተሎ፣ ውዕል ንጡፍ እንተኾይኑ ወይ ክትዕ ክፉት እንተኾይኑ
                ምድምሳስ ኣይከኣልን።
              </p>
            </>
          ),
        },
        {
          id: "exercise-rights",
          title: "መሰላትኩም ከመይ ከም ትጥቀሙ",
          content: (
            <>
              <p>
                ዝኣተዉ ተጠቀምቲ ካብ ቅጥዒ ኣካውንት ዳታኦም Export ክገብሩን ምድምሳስ ኣካውንት ክሓቱን
                ይኽእሉ። ምድምሳስ ካልእ ሰብ ብዘይ ፍቓድኩም ኣካውንትኩም ከይዓጹ ሓድሽ መረጋገጺ ይሓትት።
              </p>
              <p>
                ንምእራም፣ ምግዳብ፣ ተቓውሞ ወይ ጥርዓን ናብ{" "}
                <a href="mailto:privacy@yekis.com">privacy@yekis.com</a> ጽሓፉ። YeKis ቀልጢፉ መልሲ
                ንምሃብ ይጽዕር።
              </p>
            </>
          ),
        },
        {
          id: "automated-processing",
          title: "ብቐጥታ ዝግበሩ ፍተሻታትን ገምጋም ሰብን",
          content: (
            <>
              <p>
                YeKis ዘይልሙድ ምንቅስቓስ ክፍሊት፣ ተደጋጋሚ ወይ መታለሊ ኣካውንታት፣ ዘይተዛዘመ መረጋገጽን
                ስግኣት ድሕነትን ንምፍላይ ሕግታት ይጥቀም። ናይ መወዳእታ ውሳነታት KYC፣ ሕግን ክትዕን
                ብዝተፈቕደሎም ሰባት ተገምጊሞም ኣብ ኦዲት ይምዝገቡ።
              </p>
              <p>
                ንውሳነ ዝተጠቐመ ሓበሬታ ክትሓቱ፣ ገምጋም ሰብ ክትሓቱ ወይ ውጽኢት ክትቃወሙ ትኽእሉ።
              </p>
            </>
          ),
        },
        {
          id: "children",
          title: "ቆልዑን ዝተሓተ ዕድመን",
          content: (
            <p>
              YeKis ንቆልዑ ዝተዳለወ ኣይኮነን። ኣካውንት ንምፍጣር ወይ ነዚ ዕዳጋ ንምጥቃም ብውሑድ 18 ዓመት
              ዝመላእኩምን ብሕጊ ውዕል ክትኣስሩ እትኽእሉን ክትኮኑ ኣለኩም። ቆልዓ ሓበሬታ ከም ዝሃበና እንተፈሊጥኩም
              ብቕልጡፍ ተወከሱና።
            </p>
          ),
        },
        {
          id: "changes",
          title: "ለውጥታት እዚ ፖሊሲ",
          content: (
            <p>
              ኣገልግሎት፣ ኣሰራርሓ ወይ ሕጊ ክልወጥ ከሎ YeKis ነዚ ፖሊሲ ከሐድሶ ይኽእል። ዝጸንዓሉ ዕለትን
              ሕታምን ኣብ ላዕሊ እዚ ገጽ ይርከብ። ዓቢ ለውጢ እንተሃልዩ ብኣገልግሎት ወይ ኢሜይል ነፍልጥ።
            </p>
          ),
        },
        {
          id: "contact",
          title: "መራኸቢ ኣድራሻን ጥርዓንን",
          content: (
            <>
              <p>
                YeKis መደበሩ ኣብ ኣዲስ ኣበባ፣ ኢትዮጵያ እዩ። ሕቶታት ብሕትውና ናብ{" "}
                <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>፣ ሓፈሻዊ ደገፍ ድማ ናብ{" "}
                <a href="mailto:support@yekis.com">support@yekis.com</a> ስደዱ።
              </p>
              <p>
                ብመልስና እንተዘይዓጊብኩም ናብ ላዕለዋይ ሓላፊ ብሕትውና ወይ ናብ በዓል መዚ ሓለዋ ዳታ ኢትዮጵያ
                ጥርዓን ከተቕርቡ ትኽእሉ። ብቅንዕና ጥርዓን ምቕራብኩም ዝኾነ ሕነ ምፍዳይ ኣይግበርን።
              </p>
            </>
          ),
        },
      ],
    };
  }

  return {
    effectiveDate: "13 November 2026",
    eyebrow: "Legal and trust",
    title: "Privacy Policy",
    summary:
      "How Yekis handles identity, marketplace, payment, communications, and security data, and the choices and rights you have over that information.",
    sections: [
      {
        id: "scope",
        title: "Who we are and what this policy covers",
        content: (
          <>
            <p>
              Yekis is an Ethiopian freelance marketplace operated from Addis Ababa,
              Ethiopia. This Privacy Policy explains how Yekis collects, uses, shares,
              retains, and protects personal data when you visit the Yekis website,
              create an account, use the web workspace or Telegram Mini App, interact
              with the support team, post a job, bid on work, enter a contract, fund
              or receive a milestone payment, or use another Yekis feature.
            </p>
            <p>
              Yekis is the data controller for personal data processed through those
              services. The marketplace parties also act as independent controllers for
              information they provide to one another for a transaction, such as a
              client&apos;s business contact details shown to the freelancer they hire.
            </p>
          </>
        ),
      },
      {
        id: "information-we-collect",
        title: "Information we collect",
        content: (
          <>
            <p>We collect only information that is needed to operate, secure, and improve the marketplace.</p>
            <ul>
              <li>
                <strong>Account and authentication information:</strong> first and last
                name, display name, email address, phone number, date of birth, role,
                language and timezone preferences, password hash, Google or other
                linked provider identifier, Telegram user or chat identifier,
                verification status, and account creation or update times.
              </li>
              <li>
                <strong>Profile and marketplace information:</strong> biography, avatar,
                skills, portfolio files, availability, profile visibility, job briefs,
                proposals, cover letters, screening answers, gig listings and packages,
                contracts, milestone descriptions, delivery files, messages, reviews,
                profile views, and feature-placement activity.
              </li>
              <li>
                <strong>Identity and compliance information:</strong> verification tier,
                UCID, Fayda biometric identifier, identity documents, a selfie or other
                verification image when you choose to submit one, consent records,
                review decisions, and transaction-monitoring flags or suspicious
                transaction report records where the law requires them.
              </li>
              <li>
                <strong>Financial and payment information:</strong> wallet balance, ETB
                amounts, top-up and payment status, provider transaction references,
                withdrawals and payout destinations, ledger entries, platform fees,
                provider charges, statutory deductions, and financial audit events. Yekis
                does not store complete payment-card credentials; payment providers
                process those details directly.
              </li>
              <li>
                <strong>Communications:</strong> support conversations, direct
                messages, dispute statements and evidence, notifications, email and
                SMS delivery records, Telegram messages, and the consent choices you
                make.
              </li>
              <li>
                <strong>Technical and security information:</strong> IP address, device
                and browser information, request identifiers, authentication and security
                events, timestamps, error records, and audit-log entries for important
                state changes.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "sensitive-information",
        title: "Sensitive identity and financial information",
        content: (
          <>
            <p>
              Some information used by a freelance marketplace is sensitive. Identity
              documents, biometric identifiers, date of birth, financial records, and
              dispute evidence can create serious harm if exposed. Yekis processes
              this information only for the purpose for which you submit it, including
              identity verification, fraud prevention, payment execution, contract
              administration, dispute handling, and legal or regulatory compliance.
            </p>
            <p>
              Do not place unnecessary sensitive information in a job brief, proposal,
              message, portfolio item, or dispute statement. Access to KYC documents,
              financial records, and other restricted records is limited by staff
              role and is written to the audit trail.
            </p>
          </>
        ),
      },
      {
        id: "how-we-use",
        title: "Why we use your information",
        content: (
          <ul>
            <li>Create and secure your account, authenticate you, and recover access.</li>
            <li>Verify identity, screen for fraud, enforce marketplace rules, and comply with anti-money-laundering requirements.</li>
            <li>Publish the profile, portfolio, listings, proposals, reviews, and other content you choose to make visible to other users.</li>
            <li>Match clients and freelancers, create contracts, administer milestones, process payments, and calculate fees.</li>
            <li>Send service, delivery, payment, security, and account notifications you have asked to receive.</li>
            <li>Provide support, resolve disputes, enforce contracts, and maintain the marketplace record.</li>
            <li>Protect Yekis, its users, and the public from fraud, abuse, spam, and unlawful activity.</li>
            <li>Understand aggregate platform use and improve the product when you have permitted analytics.</li>
            <li>Meet tax, regulatory, audit, and other legal obligations.</li>
          </ul>
        ),
      },
      {
        id: "legal-bases",
        title: "Why we are permitted to process it",
        content: (
          <>
            <p>
              Depending on the processing activity, Yekis relies on one or more of the
              following legal bases under applicable law, including the Personal Data
              Protection Proclamation No. 1321/2024:
            </p>
            <ul>
              <li><strong>Performance of a contract:</strong> when processing is needed to provide the service you request, such as accounts, contracts, milestones, and payouts.</li>
              <li><strong>Legal obligation:</strong> when identity, AML, tax, audit, or record-keeping law requires us to process or retain information.</li>
              <li><strong>Legitimate interests:</strong> when processing is necessary for security, fraud prevention, service improvement, and marketplace integrity, after balancing those interests against your rights.</li>
              <li><strong>Consent:</strong> for optional analytics and marketing communications, and where the law specifically requires consent.</li>
            </ul>
            <p>
              You may withdraw consent at any time through account settings or by
              contacting us. Withdrawal does not affect processing that was lawful before
              withdrawal or processing based on another legal basis.
            </p>
          </>
        ),
      },
      {
        id: "sharing",
        title: "When we share information",
        content: (
          <>
            <p>Yekis does not sell personal data. We share information only for the purposes described in this policy, including:</p>
            <ul>
              <li><strong>Other marketplace users:</strong> information needed to present your public profile, communicate with you, administer a proposal, contract, milestone, review, or dispute, and show the identity information required for a transaction.</li>
              <li><strong>Service providers:</strong> hosting, database, object storage, Redis, email, SMS, monitoring, and support providers that process data on Yekis&apos;s instructions.</li>
              <li><strong>Payment providers:</strong> Telebirr and other providers configured for a transaction, to verify payment, hold or release milestone funds, disburse withdrawals, and reconcile records.</li>
              <li><strong>Identity and authentication providers:</strong> eSignet or Fayda for verification, Google or another configured identity provider for sign-in, and Telegram for Mini App authentication and messages.</li>
              <li><strong>Analytics and service providers you permit:</strong> Google Analytics is loaded only in a production configuration after you accept analytics cookies.</li>
              <li><strong>Professional advisers and authorities:</strong> auditors, lawyers, regulators, courts, law-enforcement bodies, or financial-intelligence authorities when disclosure is required or necessary to protect the platform and its users.</li>
              <li><strong>A business transaction:</strong> a merger, financing, restructuring, or sale, subject to confidentiality safeguards and continued notice to affected users.</li>
            </ul>
          </>
        ),
      },
      {
        id: "international-transfers",
        title: "Storage and international transfers",
        content: (
          <>
            <p>
              Yekis is designed to host its primary application, database, and object
              storage in Ethiopia. The current production deployment uses an
              Ethiopian cloud region. Access from another country, use of a global
              identity or communication provider, or support access from outside
              Ethiopia can nevertheless constitute an international transfer.
            </p>
            <p>
              Where a transfer is necessary, Yekis uses the access, contractual, and
              technical safeguards required by applicable law. Contact us for
              information about the providers and safeguards relevant to your data.
            </p>
          </>
        ),
      },
      {
        id: "security",
        title: "How we protect information",
        content: (
          <>
            <p>Yekis applies proportionate technical and organisational safeguards, including:</p>
            <ul>
              <li>Argon2id password hashing and short-lived, revocable session tokens.</li>
              <li>HTTPS for production traffic, security headers, a content security policy, rate limiting, and strict request validation.</li>
              <li>Role-based access to identity, compliance, financial, support, and dispute records.</li>
              <li>Restricted object storage and time-limited signed links for sensitive files.</li>
              <li>Append-only audit records for important financial, security, and administrative changes.</li>
              <li>Risk controls that flag unusual transaction patterns for human review.</li>
            </ul>
            <p>
              No online service can promise absolute security. If a breach affects
              your information, Yekis will contain the incident, revoke affected
              sessions, notify affected users and the appropriate authority within
              the legally required period, and record the response.
            </p>
          </>
        ),
      },
      {
        id: "retention",
        title: "How long we keep information",
        content: (
          <>
            <p>
              Yekis keeps personal data only as long as necessary for the purpose it
              was collected, to perform the service, to resolve disputes, and to meet
              legal obligations. The main retention periods are:
            </p>
            <ul>
              <li><strong>Active account and marketplace content:</strong> while the account is active and as needed to operate the transactions and relationships entered into.</li>
              <li><strong>Identity, KYC, financial, transaction, consent, dispute, and audit records:</strong> generally for up to ten years where applicable law or regulatory record-keeping rules require retention.</li>
              <li><strong>Support conversations and dispute evidence:</strong> while the matter is open and for the period needed to establish, exercise, or defend legal claims.</li>
              <li><strong>Security and technical records:</strong> for the period needed to investigate incidents, enforce the terms, and protect the service.</li>
              <li><strong>Consent history:</strong> retained as evidence of what you agreed to and when.</li>
            </ul>
            <p>
              When you request erasure, Yekis destroys profile content, credentials,
              uploaded personal media, chat and direct-message content written by you,
              portfolio items, skills, marketplace copy, notifications, and analytics.
              The account is closed and its sessions are revoked. Records that law
              requires Yekis to retain, including identity evidence, KYC records,
              wallets, transactions, ledger entries, audit logs, consent history,
              contracts, milestones, disputes, evidence, and reviews written about you,
              remain available for the required period. The erasure response lists the
              retained categories.
            </p>
          </>
        ),
      },
      {
        id: "cookies",
        title: "Cookies, browser storage, and analytics",
        content: (
          <>
            <p>
              Yekis uses browser storage for functions that cannot work without it,
              including authentication tokens, theme and language preferences, consent
              choices, and temporary payment-return state. Essential storage is not
              switched off because it is required for account security and the service
              to function.
            </p>
            <p>
              Optional analytics uses Google Analytics in production only when a
              measurement identifier is configured and you have accepted analytics
              cookies. Yekis&apos;s analytics events are designed not to include email
              addresses, phone numbers, names, account identifiers, or user-specific
              payment amounts. You can reject analytics and marketing choices in the
              consent banner and change your mind later.
            </p>
          </>
        ),
      },
      {
        id: "your-rights",
        title: "Your privacy rights",
        content: (
          <>
            <p>Subject to applicable law, you may have the right to:</p>
            <ul>
              <li>Know what personal data Yekis holds about you and obtain a copy.</li>
              <li>Receive that data in a portable, machine-readable format.</li>
              <li>Correct inaccurate or incomplete information.</li>
              <li>Ask Yekis to erase personal data when no legal obligation requires retention.</li>
              <li>Withdraw consent and stop optional marketing or analytics processing.</li>
              <li>Restrict or object to processing that is based on legitimate interests.</li>
              <li>Receive notice of a legally required disclosure and challenge it where the law allows.</li>
              <li>Complain to the competent Ethiopian data protection authority.</li>
            </ul>
            <p>
              Yekis cannot delete financial or identity records that must be retained
              by law, and cannot erase records while money is in flight, a contract is
              active, or a dispute is open. In those cases, the request is refused with
              the specific items that must first be resolved.
            </p>
          </>
        ),
      },
      {
        id: "exercise-rights",
        title: "How to exercise your rights",
        content: (
          <>
            <p>
              Signed-in users can export their data and request account erasure from
              account settings. Export produces the account, profile, verification,
              financial, marketplace, communications, consent, and compliance records
              that Yekis holds. Erasure requires fresh authentication so that another
              person cannot close your account without your consent.
            </p>
            <p>
              For a correction, restriction, objection, complaint, or any other
              privacy request, email <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>.
              Include enough detail for us to identify the account and the request.
              We may ask for verification before acting. Yekis aims to acknowledge a
              request promptly and will explain if a lawful exception applies.
            </p>
          </>
        ),
      },
      {
        id: "automated-processing",
        title: "Automated checks and human review",
        content: (
          <>
            <p>
              Yekis uses rules to detect unusual transaction patterns, possible
              duplicate or fraudulent accounts, incomplete verification, security
              anomalies, and content that may breach the terms. These rules can place
              an account, payment, or listing under review. Final compliance, KYC, and
              dispute decisions are made by authorised people through controlled
              workflows and are recorded in the audit trail.
            </p>
            <p>
              You can ask for the information used to make a decision, request human
              review, or contest an outcome where applicable law gives you that right.
            </p>
          </>
        ),
      },
      {
        id: "children",
        title: "Children and minimum age",
        content: (
          <p>
            Yekis is not intended for children. You must be at least 18 years old and
            legally able to enter a binding contract to create an account or use the
            marketplace. We do not knowingly collect personal data directly from a
            child. If you believe a child has provided information to us, contact us
            immediately so we can review and remove it where required.
          </p>
        ),
      },
      {
        id: "changes",
        title: "Changes to this policy",
        content: (
          <p>
            Yekis may update this policy when the service, our processing, or the law
            changes. The effective date and version at the top of this page identify
            the current version. We will provide additional notice through the service
            or by email when a change materially affects your rights. Continuing to use
            Yekis after the notice means the updated policy applies from its effective
            date, except where the law requires fresh consent.
          </p>
        ),
      },
      {
        id: "contact",
        title: "Contact and complaints",
        content: (
          <>
            <p>
              Yekis is based in Addis Ababa, Ethiopia. Send privacy questions to{" "}
              <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>. For general
              account or marketplace support, email{" "}
              <a href="mailto:support@yekis.com">support@yekis.com</a>.
            </p>
            <p>
              If you are not satisfied with our response, you may ask for escalation
              to our privacy contact or complain to the competent Ethiopian data
              protection authority. We will not retaliate against you for making a
              good-faith privacy request or complaint.
            </p>
          </>
        ),
      },
    ],
  };
}

export function PrivacyPage({ onNavigate }: PrivacyPageProps) {
  const { language } = useI18n();
  const copy = getPrivacyCopy(language);

  return (
    <LegalDocumentPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      summary={copy.summary}
      effectiveDate={copy.effectiveDate}
      sections={copy.sections}
      contactEmail="privacy@yekis.com"
      onNavigate={onNavigate}
    />
  );
}
