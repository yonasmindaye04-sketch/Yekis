import "./marketing.css";
import { type Language, useI18n } from "./i18n";
import { LegalDocumentPage, type LegalSection } from "./LegalDocumentPage";

type TermsPageProps = {
  onNavigate: (page: string) => void;
};

type LocalizedTermsCopy = {
  effectiveDate: string;
  eyebrow: string;
  title: string;
  summary: string;
  sections: LegalSection[];
};

function getTermsCopy(
  language: Language,
  onNavigate: (page: string) => void
): LocalizedTermsCopy {
  if (language === "am") {
    return {
      effectiveDate: "ኖቬምበር 13፣ 2026",
      eyebrow: "ሕግ እና እምነት",
      title: "የአገልግሎት ውል",
      summary:
        "ደንበኞች፣ ባለሙያዎች እና YeKis የገበያ ቦታውን እንዴት እንደሚጠቀሙ፣ ስምምነቶችን እንደሚፈጽሙ፣ ምዕራፎችን በገንዘብ እንደሚደግፉ፣ ክርክሮችን እንደሚፈቱ እና አገልግሎቱን እንደሚጠብቁ የሚገዙ ደንቦች።",
      sections: [
        {
          id: "agreement",
          title: "ስምምነት እና ብቁነት",
          content: (
            <>
              <p>
                እነዚህ የአገልግሎት ውሎች የYeKis ድረ-ገጽን፣ የዌብ የሥራ ቦታውን፣ የቴሌግራም Mini Appን፣
                ቦቱን፣ የድጋፍ አገልግሎቶችን እና የገበያ ቦታውን ለመጠቀም በእርስዎ እና በYeKis መካከል የሚመሠረት
                አስገዳጅ ስምምነት ናቸው። መለያ በመፍጠር ወይም አገልግሎቱን በመጠቀም እነዚህን ውሎች እና{" "}
                <button
                  type="button"
                  className="legal-inline-link"
                  onClick={() => onNavigate("privacy")}
                >
                  የግላዊነት ፖሊሲን
                </button>
                {" "}ይቀበላሉ።
              </p>
              <p>
                ቢያንስ 18 ዓመት የሞላዎት፣ በሕግ አስገዳጅ ውል መዋዋል የሚችሉ እና የአገልግሎቱ አጠቃቀም ሕጋዊ
                በሆነበት ሥልጣን ውስጥ የሚገኙ መሆን አለብዎት። YeKisን ለድርጅት የሚጠቀሙ ከሆነ፣ ድርጅቱን
                በሕግ የማሰር ሥልጣን እንዳለዎት እና ድርጅቱ እነዚህን ውሎች እንደሚቀበል ያረጋግጣሉ።
              </p>
            </>
          ),
        },
        {
          id: "platform-role",
          title: "YeKis የገበያ ቦታ እንጂ ቀጣሪዎ ወይም ወኪልዎ አይደለም",
          content: (
            <>
              <p>
                YeKis ደንበኞችን እና ባለሙያዎችን የሚያገናኝ ቴክኖሎጂ እና የሥራ ሂደት ያቀርባል። YeKis የየትኛውም
                ወገን ቀጣሪ፣ የሠራተኛ ምልመላ ኤጀንሲ፣ መልማይ ወይም ሕጋዊ ወኪል አይደለም። ደንበኞች እና
                ባለሙያዎች ከሥራቸው ጋር ለተያያዙ ታክሶች፣ ፈቃዶች፣ ኢንሹራንስ እና ሕጋዊ ግዴታዎች ኃላፊነት
                ያለባቸው ገለልተኛ ተዋዋዮች ናቸው (እነዚህ ውሎች ወይም የተፈረመ የአገልግሎት ስምምነት በግልጽ
                በተለየ ሁኔታ ካልደነገጉ በስተቀር)።
              </p>
              <p>
                YeKis የመለያ መዳረሻን፣ የማንነት እና የግብይት መቆጣጠሪያዎችን፣ ውሎችን፣ የምዕራፍ ክፍያን፣
                የክፍያ መዝገቦችን፣ ክርክሮችን እና ድጋፍን ያስተዳድራል። ለዋናው ሥራ ያለው የንግድ ግንኙነት
                በደንበኛው እና በባለሙያው መካከል ነው።
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "መለያዎች፣ መዳረሻ እና የማንነት ማረጋገጫ",
          content: (
            <>
              <p>
                ትክክለኛ የምዝገባ እና የመገለጫ መረጃ ማቅረብ፣ ወቅታዊ ማድረግ እና YeKis በጽሑፍ ካልፈቀደ
                በስተቀር አንድ መለያ ብቻ መጠቀም አለብዎት። በመለያዎ ሥር ለሚደረግ እንቅስቃሴ እንዲሁም የይለፍ
                ቃልዎን እና የማረጋገጫ ኮዶችዎን በሚስጥር ለመጠበቅ ኃላፊነት አለብዎት። መለያዎ ወይም የመግቢያ
                መረጃዎ እንደተጠለፈ ካመኑ ወዲያውኑ ለድጋፍ ክፍሉ ያሳውቁ።
              </p>
              <p>
                YeKis ሥራ ከመለጠፍዎ፣ ከማመልከትዎ፣ ውል ከመዋዋልዎ፣ ገንዘብ ከማስገባትዎ፣ ከመቀበልዎ ወይም
                ከማውጣትዎ በፊት የስልክ፣ የኢሜይል፣ የማንነት፣ የፋይዳ ወይም ሌላ ማረጋገጫ ሊጠይቅ ይችላል።
                ለእርስዎ ወይም ሲፈቀድ ለድርጅትዎ የሚገቡ ትክክለኛ መረጃዎችን እና እውነተኛ ሰነዶችን ብቻ ማቅረብ
                አለብዎት። ማረጋገጫ የአንድ ተጠቃሚ ታማኝነት፣ ብቃት ወይም የወደፊት አፈጻጸም ዋስትና አይደለም።
              </p>
            </>
          ),
        },
        {
          id: "marketplace-content",
          title: "የገበያ ቦታ ይዘትዎ",
          content: (
            <>
              <p>
                የሚያቀርቡት ይዘት ባለቤትነት እንደተጠበቀ ይቆያል። አገልግሎቱን ለማስኬድ፣ ግብይቶችን ለማስተዳደር፣
                ጥቃትን ለመከላከል እና ሕግን ለማክበር አስፈላጊ በሆነው መጠን ብቻ YeKis ያንን ይዘት እንዲያስተናግድ፣
                እንዲያስኬድ፣ እንዲያሳይ፣ እንዲያባዛ እና እንዲያስተላልፍ የተገደበ ፈቃድ ይሰጣሉ።
              </p>
              <p>
                ይዘቱን የማቅረብ መብት እንዳለዎት፣ ትክክለኛ መሆኑን እና ማተም የሌላ ሰውን መብት እንደማይጥስ
                ያረጋግጣሉ። ካልተፈቀደልዎ በስተቀር የሌላ ሰውን ሚስጥራዊ መረጃ፣ የማንነት ሰነድ፣ የክፍያ መረጃ
                ወይም የግል ግንኙነት አያስገቡ።
              </p>
            </>
          ),
        },
        {
          id: "prohibited-use",
          title: "የተከለከሉ ተግባራት",
          content: (
            <>
              <p>YeKisን ለሚከተሉት መጠቀም የለብዎትም፡</p>
              <ul>
                <li>ሕገ-ወጥ ሥራን፣ የተሰረቁ ዕቃዎችን፣ ጎጂ ቁሳቁሶችን፣ አሳሳች የኢንቨስትመንት ምርቶችን ወይም የሌላ ሰውን መብት የሚጥሱ አገልግሎቶችን ማቅረብ ወይም መጠየቅ።</li>
                <li>ማጭበርበር፣ የማንነት ወይም የKYC ሰነዶችን ማስመሰል፣ ሌላ ሰው መምሰል ወይም ብቃትን፣ ግምገማን ወይም ውጤትን አዛብቶ ማቅረብ።</li>
                <li>ሌላ ሰውን ማዋከብ፣ ማስፈራራት፣ መድልዎ ማድረግ፣ መከታተል ወይም በሕገ-ወጥ መንገድ መበዝበዝ።</li>
                <li>ማልዌር፣ ጎጂ ኮድ፣ የስድብ ይዘት ወይም የቅጂ መብትን፣ ግላዊነትን ወይም ሚስጥራዊነትን የሚጥስ ይዘት መጫን።</li>
                <li>መረጃ መሰብሰብ (Scrape)፣ Reverse engineer ማድረግ፣ አገልግሎቱን ማጨናነቅ ወይም የደህንነት መቆጣጠሪያዎችንና የፍጥነት ገደቦችን ለማለፍ መሞከር።</li>
                <li>የሌላ ሰውን መለያ መጠቀም፣ የመግቢያ መረጃን ማጋራት፣ መለያን መሸጥ ወይም የማረጋገጫ ሁኔታን ማስተላለፍ።</li>
                <li>ክፍያዎችን፣ የክርክር መዝገቦችን ወይም የYeKis ጥበቃዎችን ለማስቀረት ግብይትን ከመድረኩ ውጭ ማውጣት ወይም ሌላ ተጠቃሚን እንዲያወጣ መጠየቅ።</li>
                <li>ባልተፈቀደ፣ ባልተሰራ ወይም በተቀበሉት ውሎች መሠረት ሊከፈል ለማይገባ ሥራ ገንዘብ ለማውጣት ወይም ተመላሽ ለማግኘት መሞከር።</li>
                <li>ያልተፈቀዱ የጅምላ መልዕክቶችን፣ ስፓምን ወይም ሕገ-ወጥ የግብይት መልዕክቶችን መላክ።</li>
              </ul>
            </>
          ),
        },
        {
          id: "jobs-and-gigs",
          title: "ሥራዎች፣ ፕሮፖዛሎች እና የአገልግሎት ጥቅሎች",
          content: (
            <>
              <p>
                ደንበኞች ግልጽ መግለጫ፣ በጀት፣ የጊዜ ገደብ እና የምዕራፍ ሁኔታዎችን በመጥቀስ ሥራዎችን መለጠፍ
                ይችላሉ። ባለሙያዎች ብቁ ሲሆኑ እና ሥራውን ለመሥራት ሲችሉ ብቻ ፕሮፖዛል ማቅረብ ይችላሉ።
                ደንበኞች ፕሮፖዛል መቀበል ወይም የታተመ የጊግ (Gig) ጥቅል ማዘዝ ይችላሉ። ተዋዋይ ወገኖች
                በሥራ ቦታው የሚታዩትን የመቀበል፣ የፊርማ እና የገንዘብ ማስያዝ ደረጃዎች እስኪያጠናቅቁ ድረስ
                ፕሮፖዛል፣ ትዕዛዝ ወይም ቀጥታ መልዕክት ውል አይሆንም።
              </p>
              <p>
                ደንበኛው ወይም ባለሙያው የሥራ ቦታው በሚፈቅድበት ቦታ ተቀባይነት ከማግኘቱ በፊት ፕሮፖዛልን መሰረዝ
                ወይም ማሻሻል ይችላል። ተቀባይነት ካገኘ በኋላ የተፈረመው የአገልግሎት ስምምነት፣ የምዕራፍ ውሎች
                እና እነዚህ ውሎች ግንኙነቱን ይገዛሉ። YeKis እነዚህን ውሎች የሚጥስ ወይም ሕጋዊና የደህንነት
                ስጋት የሚፈጥር ይዘትን ሊያስወግድ ይችላል።
              </p>
            </>
          ),
        },
        {
          id: "contracts",
          title: "ውሎች እና የአገልግሎት ስምምነት",
          content: (
            <>
              <p>
                ተዋዋይ ወገኖች ፕሮፖዛልን ሲቀበሉ፣ YeKis የተስማሙበትን የሥራ ወሰን፣ ዋጋ፣ የምዕራፍ መርሐ-ግብር፣
                ፊርማዎች እና የአገልግሎት ስምምነት ውሎችን ይመዘግባል። የሥራ ቦታው ቅጂ የዚህ ስምምነት የአፈጻጸም
                መዝገብ ነው። እያንዳንዱ ወገን ከመፈረሙ ወይም ገንዘብ ከማስገባቱ በፊት ስምምነቱን እና የምዕራፍ
                ውሎችን ማንበብ አለበት።
              </p>
              <p>
                የተፈረመ የአገልግሎት ስምምነት ከእነዚህ ውሎች ጋር ሲጋጭ፣ ግጭቱ ሕጋዊ እስከሆነ ድረስ ለዚያ
                ሥራ የተፈረመው ስምምነት የበላይነት ይኖረዋል። እነዚህ ውሎች የፕላትፎርም አጠቃቀምን፣ መለያዎችን፣
                ክፍያዎችን፣ ክርክሮችን፣ ሚስጥራዊነትን እና ተጠያቂነትን መግዛታቸውን ይቀጥላሉ።
              </p>
            </>
          ),
        },
        {
          id: "milestone-funding",
          title: "የምዕራፍ ገንዘብ ማስያዝ እና የክፍያ ጥበቃ",
          content: (
            <>
              <p>
                ለአንድ ምዕራፍ ገንዘብ ማስገባት የተገለጸውን መጠን በYeKis የክፍያ እና የሌጀር ስርዓቶች ውስጥ
                ለዚያ ምዕራፍ ይመድባል። ገንዘቡ ስለተያዘ ብቻ ለባለሙያው አይለቀቅም። ባለሙያው የተስማሙበትን
                ሥራ መሥራት፣ ውጤቱን ማስረከብ እና የግምገማና የክርክር ሂደቱን መከተል አለበት።
              </p>
              <p>
                የYeKis የምዕራፍ ሂደት ባለሙያ ያለ ማስረከቢያ እንዳይከፈል እና ደንበኛ የቀረበን ሥራ ያለ
                ክርክር ላልተወሰነ ጊዜ እንዳይዝ ለመከላከል የተዘጋጀ የገበያ ቦታ ጥበቃ ነው። ይህ የአፈጻጸም
                ዋስትና፣ የክርክር ውጤት ቃል ኪዳን፣ የኢንሹራንስ ፖሊሲ ወይም የክፍያ ሰነድ በግልጽ ካልገለጸ
                በስተቀር ገንዘቡ ፈቃድ ባለው ባንክ በተለየ የአደራ ሂሳብ ውስጥ መቀመጡን የሚገልጽ መግለጫ አይደለም።
              </p>
              <p>
                ክፍያዎች ለአገልግሎት ሰጪ ማስታረቂያ፣ ለማጭበርበር ፍተሻዎች፣ ለሕጋዊ እገዳዎች እና ለአስገዳጅ
                ተቀናሾች ተገዢ ናቸው። YeKis በሕጋዊ ወይም በተገዢነት እገዳ ምክንያት ትክክለኛ ክፍያ
                ማግኘት፣ ማረጋገጥ ወይም መልቀቅ ካልቻለ የተጎዳው ምዕራፍ እንደተለቀቀ አይቆጠርም።
              </p>
            </>
          ),
        },
        {
          id: "acceptance-and-release",
          title: "ተቀባይነት፣ ራስ-ሰር ክፍያ መልቀቅ እና የመቀዝቀዣ ጊዜ",
          content: (
            <>
              <p>
                ባለሙያው የሥራ ውጤት ካስረከበ በኋላ ደንበኛው በመደበኛነት ለመቀበል ወይም ክርክር ለማንሳት ሰባት
                የቀን መቁጠሪያ ቀናት አሉት። YeKis ራስ-ሰር የመልቀቂያ ገደብ ከማለቁ በፊት ማስጠንቀቂያ
                ይልካል። ደንበኛው እርምጃ ካልወሰደ እና ምንም ሕጋዊ፣ የደህንነት ወይም የክርክር እገዳ ከሌለ፣
                ምዕራፉ በዚያ ጊዜ መጨረሻ ላይ በራስ-ሰር ሊለቀቅ ይችላል።
              </p>
              <p>
                አንድ ወገን በሥራ ቦታው በተፈቀደው ጊዜ ውስጥ ክርክር ሊያነሳ ይችላል። በወቅቱ ክርክር ማንሳት
                ክርክሩ እስኪታይ ድረስ ራስ-ሰር መልቀቅን ያቆማል። እንዲሁም ሥራው ካልተጀመረ እና በሥራ ቦታው
                የሚገኙት ሁኔታዎች ከተሟሉ ደንበኛው ሕጋዊ የሰባት ቀን የመሰረዣ (Cooling-off) መብቱን ሊጠቀም ይችላል።
              </p>
            </>
          ),
        },
        {
          id: "fees-and-taxes",
          title: "ክፍያዎች፣ ታክሶች እና የክፍያ አገልግሎት ሰጪ ወጪዎች",
          content: (
            <>
              <p>
                ከግብይት በፊት የሚታየው ክፍያ ያንን ግብይት ይገዛል። የአሁኑ የYeKis ሞዴል ከባለሙያው የተለቀቀ
                የምዕራፍ መጠን 7% የፕላትፎርም ክፍያ ያስከፍላል፣ ከደንበኛው ግን ምንም ተጨማሪ የማስገቢያ ክፍያ
                አይጠይቅም። የክፍያ ወይም የገንዘብ ማከፋፈያ አገልግሎት ሰጪም በሚመለከትበት ቦታ የሚገለጽ የራሱን
                ክፍያ ሊያስከፍል ይችላል። የታተሙትን ተመኖች ለማየት{" "}
                <button
                  type="button"
                  className="legal-inline-link"
                  onClick={() => onNavigate("fees")}
                >
                  የክፍያዎች ገጽን
                </button>{" "}
                ይመልከቱ።
              </p>
              <p>
                YeKis ክፍያዎችን ወደፊት ተግባራዊ በሚሆን መልኩ ሊለውጥ ይችላል። ለውጥ ቀደም ሲል ገንዘብ በተያዘለት
                ውል ወይም ምዕራፍ ላይ ወደኋላ ተመልሶ አይተገበርም። YeKis በሕግ የሚጠየቁ መጠኖችን (ታክስን፣
                ፀረ-ገንዘብ ማጠብን፣ የፍርድ ቤት ወይም የተቆጣጣሪ ትዕዛዞችን ጨምሮ) ሊቆርጥ ወይም ሊይዝ ይችላል።
                ተጠቃሚዎች ለራሳቸው የታክስ ግዴታ ኃላፊነት አለባቸው።
              </p>
            </>
          ),
        },
        {
          id: "wallet-and-payouts",
          title: "ዋሌት፣ ገንዘብ ማውጣት እና የተቀባይ ኃላፊነት",
          content: (
            <>
              <p>
                የተለቀቁ የምዕራፍ መጠኖች ወደ ባለሙያው የYeKis ዋሌት ገቢ ይደረጋሉ። ገንዘብ ለማውጣት ባለሙያው
                በዋሌቱ ውስጥ የሚታዩትን የማረጋገጫ፣ የሕግ ተገዢነት እና የመለያ ሁኔታዎች ማሟላት እና ሲጠየቅ
                በSMS ኮድ ጭምር የተወሰነውን ክፍያ ማጽደቅ አለበት። YeKis ክፍያዎችን በተዋቀረው የክፍያ አገልግሎት
                ሰጪ በኩል ይልካል እና እያንዳንዱን ሙከራ፣ ውጤት እና ክፍያ ይመዘግባል።
              </p>
              <p>
                የእርስዎ የሆነ ወይም በሕግ የተፈቀደልዎ ትክክለኛ የክፍያ መድረሻ ማቅረብ አለብዎት። ገንዘብ ማውጣትን
                ከማጽደቅዎ በፊት መድረሻውን እና መጠኑን ያረጋግጡ። በተሳሳተ መረጃ፣ ባልተፈቀደ መሣሪያ ወይም
                በመለያው ባለቤት ተረጋግጦ ወደ ተሳሳተ መድረሻ በተላከ ክፍያ ለሚደርስ ኪሳራ YeKis ተጠያቂ አይደለም።
                ዋሌት የገበያ ቦታ ቀሪ ሂሳብ እንጂ የባንክ የተቀማጭ ሂሳብ አይደለም፤ በግልጽ ካልተገለጸ በስተቀር ወለድ አያስገኝም።
              </p>
            </>
          ),
        },
        {
          id: "disputes",
          title: "የክርክር አፈታት",
          content: (
            <>
              <p>
                ክርክር አንድን የተወሰነ ገንዘብ የተያዘለት ምዕራፍ ወይም የጊግ ትዕዛዝ ይመለከታል። ሂደቱ ከድርድር ወደ
                ማስረጃ፣ ወደ ሽምግልና እና አስፈላጊ ሲሆን ወደ ግልግል ዳኝነት ይሸጋገራል። ሁለቱም ወገኖች እውነተኛ
                መረጃ መስጠት፣ አግባብነት ያላቸውን ማስረጃዎች መጠበቅ፣ በተገለጹት የጊዜ ገደቦች ውስጥ ምላሽ መስጠት
                እና የመረጡትን ሂደት ውጤት መቀበል አለባቸው።
              </p>
              <p>
                YeKis ውሉን፣ የክፍያ ሁኔታውን፣ ማስረከቢያውን፣ መልዕክቶችን፣ ፋይሎችን እና የኦዲት ታሪኩን
                በመመርመር ምዕራፉን ሊለቅ፣ ሊመልስ ወይም ሊያከፋፍል ይችላል። የሠራተኛ ውሳኔ በሌጀሩ እና በኦዲት
                መዝገቡ ላይ ይጻፋል። ሽምግልና ጉዳዩን ካልፈታው፣ የተፈረመው ስምምነት በሚመለከተው የግልግል
                ዳኝነት እና የዕርቅ አዋጅ እና ስምምነቱ በሚጠቅሰው (AACCSAን ጨምሮ) ተቋም ደንቦች መሠረት በአዲስ
                አበባ ግልግል እንዲደረግ ያደርጋል።
              </p>
              <p>
                ተጠቃሚ ሐሰተኛ የይገባኛል ጥያቄ ማቅረብ፣ ቁሳዊ ማስረጃ መደበቅ ወይም እውነተኛ ግዴታን ለማምለጥ
                ክርክርን ለመጠቀም መሞከር የለበትም። ከክርክር ጋር የተያያዘ ማጭበርበር ወይም ማሴር የመለያ እርምጃ
                እና ሌሎች ሕጋዊ እርምጃዎችን ሊያስከትል ይችላል።
              </p>
            </>
          ),
        },
        {
          id: "reviews",
          title: "ግምገማዎች እና ስም",
          content: (
            <>
              <p>
                ግምገማዎች እና ደረጃዎች የሌላኛውን ወገን ልምድ ያንጸባርቃሉ። እነዚህ በYeKis የተሰጡ ዋስትናዎች፣
                የጥራት ማረጋገጫዎች ወይም የግል መረጃን ለማተም የተሰጡ ፈቃዶች አይደሉም። ግምገማዎች ትክክለኛ፣
                ተገቢ እና ከትንኮሳ፣ ከዛቻ፣ ከመድልዎ ወይም ውሎችን ከሚጥስ ይዘት የጸዱ መሆን አለባቸው።
              </p>
              <p>
                ሐሰተኛ፣ አሳዳጅ ወይም የተጭበረበረ የሚመስል ግምገማ ለግምገማ ሪፖርት ሊደረግ ይችላል። YeKis ደንቦቹ
                ሲጠይቁ ግምገማን ሊደብቅ፣ ሊያስተካክል ወይም ሊያስወግድ እና ሕጋዊ ወይም የኦዲት ግዴታ ሲኖር
                የግምገማ ታሪኩን ጠብቆ ሊያቆይ ይችላል።
              </p>
            </>
          ),
        },
        {
          id: "intellectual-property",
          title: "የአእምሮአዊ ንብረት እና የሥራ ባለቤትነት",
          content: (
            <>
              <p>
                እያንዳንዱ ወገን ከሥራው በፊት የነበረውን የአእምሮአዊ ንብረት ባለቤትነት ይይዛል። የተፈረመው
                የአገልግሎት ስምምነት በተለየ ሁኔታ ካልገለጸ በስተቀር፣ የምዕራፍ ክፍያ መፈጸም በዚያ ምዕራፍ
                ሥር የተከፈለባቸውን ልዩ ውጤቶች የተስማሙበትን መብቶች ለደንበኛው ያስተላልፋል። ያልተከፈለባቸው
                መብቶች፣ መሣሪያዎች፣ አብነቶች እና ቀድሞ የነበረ አእምሮአዊ ንብረት ከዋናው ባለቤት ጋር ይቆያሉ።
              </p>
              <p>
                ባለሙያ የፖርትፎሊዮ ወይም ቀድሞ የነበረ ቁሳቁስ ማካተት የሚችለው በደንበኛው ፈቃድ ብቻ ነው።
                YeKis በማስተናገዱ ብቻ የገበያ ቦታ ይዘት ባለቤትነትን አይጠይቅም።
              </p>
            </>
          ),
        },
        {
          id: "confidentiality",
          title: "ሚስጥራዊነት እና ግላዊነት",
          content: (
            <>
              <p>
                ደንበኞች እና ባለሙያዎች በአገልግሎቱ በኩል የሚያገኙትን ይፋ ያልሆነ መረጃ በሚስጥር መጠበቅ እና
                ሥራውን ለማከናወን ብቻ መጠቀም አለባቸው። እነዚህ ግዴታዎች ቀድሞውኑ ይፋ በሆነ፣ ያለ ገደብ በሕጋዊ
                መንገድ በሚታወቅ ወይም በራሱ በተገነባ መረጃ ላይ አይተገበሩም።
              </p>
              <p>
                የግል መረጃ በግላዊነት ፖሊሲ መሠረት ይያዛል። ተጠቃሚዎች የሌላ ሰውን መረጃ አላግባብ መጠቀም፣
                የግል መረጃን መሰብሰብ (Scrape) ወይም ካልተገናኘ ግብይት ጋር በተያያዘ መጠቀም የለባቸውም።
              </p>
            </>
          ),
        },
        {
          id: "communications",
          title: "ግንኙነቶች፣ ማሳወቂያዎች እና ድጋፍ",
          content: (
            <>
              <p>
                YeKis የመለያ፣ የደህንነት፣ የማረጋገጫ፣ የውል፣ የክፍያ፣ የማስረከቢያ፣ የክርክር እና የሕግ
                ማሳወቂያዎችን በኢሜይል፣ በSMS፣ በመተግበሪያ ማሳወቂያ፣ በቴሌግራም ወይም በሌላ ተስማሚ መንገድ
                ሊልክ ይችላል። ማሳወቂያዎች እንዲደርሱዎት የመገኛ መረጃዎን ወቅታዊ ያድርጉ።
              </p>
              <p>
                ድጋፍ በውስጠ-መተግበሪያ እገዛ ቢሮ እና በድረ-ገጹ ላይ በሚታዩ የመገኛ መስመሮች ይገኛል። ስለ ሥራ
                ጥራት፣ ገንዘብ ወይም ውል አፈጻጸም የሚነሳ ክርክር ሁለቱም ወገኖች እና YeKis አስፈላጊው መዝገብ
                እንዲኖራቸው በሚመለከተው የሥራ ቦታ ክርክር ፍሰት ውስጥ መሆን አለበት። አጠቃላይ ድጋፍ ከዚያ ፍሰት
                ውጭ አስገዳጅ የፋይናንስ ወይም የክርክር ውሳኔዎችን አይወስንም።
              </p>
            </>
          ),
        },
        {
          id: "suspension-and-termination",
          title: "ማገድ፣ መዝጋት እና ማቋረጥ",
          content: (
            <>
              <p>
                የዋሌት ቀሪ ሂሳብ፣ በመጠባበቅ ላይ ያለ ክፍያ ወይም ገቢ፣ ንቁ ውል ወይም ክፍት ክርክር በሌለበት
                ጊዜ መለያዎን መዝጋት ይችላሉ። መዝጋት መዳረሻን ያቆማል እና ክፍለ ጊዜዎችን ይሽራል። ከመዘጋቱ
                በፊት ለተነሱ ክፍያዎች፣ ክርክሮች እና ግዴታዎች ኃላፊነት አለብዎት።
              </p>
              <p>
                YeKis ማጭበርበርን፣ የማንነት ስጋቶችን፣ የደህንነት ክስተቶችን፣ የክፍያ መዛባቶችን፣ ሕጋዊ
                ጥያቄዎችን ወይም የእነዚህን ውሎች ከባድ ጥሰት በሚመረምርበት ጊዜ መዳረሻን ሊገድብ ወይም ሊያግድ
                ይችላል። ለከባድ ወይም ተደጋጋሚ ጥሰት፣ ለሕገ-ወጥ አጠቃቀም፣ ለማስመሰል ወይም የክፍያ ስርዓቱን
                ላለአግባብ መጠቀም መለያውን ሊያቋርጥ ይችላል። ጉዳዩ አጣዳፊ ካልሆነ YeKis ማሳወቂያ እና ምላሽ
                የመስጠት ዕድል ይሰጣል።
              </p>
              <p>
                ማገድ ግብይትን አያጠፋም ወይም ከውሉ፣ ከክርክር ደንቦቹ ወይም ከሕጉ በተቃራኒ ገንዘብን አይለቅም።
                የማቆየት ግዴታ ያለባቸው መዝገቦች በግላዊነት ፖሊሲው ላይ እንደተገለጸው ይቆያሉ።
              </p>
            </>
          ),
        },
        {
          id: "warranties-and-liability",
          title: "ዋስትናዎች፣ ማስተባበያዎች እና ተጠያቂነት",
          content: (
            <>
              <p>
                YeKis ሕጉ በሚፈቅደው መጠን አገልግሎቱን "እንደተገኘ" እና "እንዳለ" ያቀርባል። አገልግሎቱ ያለማቋረጥ
                እንደሚሠራ፣ እያንዳንዱ ተጠቃሚ ታማኝ ወይም ብቁ መሆኑን፣ ክርክር የተወሰነ ውጤት እንደሚያገኝ ወይም
                የሦስተኛ ወገን አገልግሎት ሰጪ ሁልጊዜ እንደሚገኝ ዋስትና አይሰጥም። ተጠቃሚዎች ሌላ ወገን፣ ሥራ፣
                የክፍያ ዘዴ ወይም ግብይት ለእነርሱ ተስማሚ መሆኑን የመገምገም ኃላፊነት አለባቸው።
              </p>
              <p>
                ሕጉ በሚፈቅደው ሙሉ መጠን፣ YeKis ለተዘዋዋሪ ወይም ለሚከተሉ ኪሳራዎች፣ ለትርፍ ማጣት፣ ለንግድ
                ዕድል ማጣት ወይም በሌላ ተጠቃሚ ባህሪ ለሚደርስ ጉዳት ተጠያቂ አይደለም። እንዲሁም መለያዎን ባለመጠበቅዎ፣
                ትክክለኛ መረጃ ባለመስጠትዎ ወይም የውል እና የክርክር ቀነ-ገደቦችን ባለመከተልዎ ለሚደርሱ ኪሳራዎች
                ተጠያቂ አይደለም።
              </p>
              <p>
                በእነዚህ ውሎች ውስጥ ያለ ምንም ነገር በሸማቾች ጥበቃ፣ በፀረ-ገንዘብ ማጠብ ወይም በሌላ አስገዳጅ ሕግ
                መሠረት በሕግ ሊገለል ወይም ሊገደብ የማይችልን ተጠያቂነት ወይም መብት አያገልም።
              </p>
            </>
          ),
        },
        {
          id: "indemnity",
          title: "ካሳ (Indemnity)",
          content: (
            <p>
              ሕጉ በሚፈቅደው መጠን፣ ከእነዚህ ውሎች ከባድ ጥሰትዎ፣ የሌላ ሰውን መብት በመጣስዎ፣ በሕገ-ወጥ ይዘትዎ
              ወይም ባህሪዎ፣ በሐሰተኛ መረጃዎ ወይም ስለ ማንነትዎና ሥልጣንዎ በተሳሳተ መግለጫ ምክንያት ለሚነሱ የይገባኛል
              ጥያቄዎች፣ ኪሳራዎች እና ተገቢ ወጪዎች YeKisን እና ሠራተኞቹን ካሳ ለመክፈል ይስማማሉ። YeKis ተገቢ
              በሆነ ጊዜ ስለተሸፈነ የይገባኛል ጥያቄ ያሳውቅዎታል እንዲሁም በመከላከያው ላይ እንዲሳተፉ ይፈቅድልዎታል።
            </p>
          ),
        },
        {
          id: "changes",
          title: "የእነዚህ ውሎች ለውጦች",
          content: (
            <p>
              YeKis የአገልግሎቱን፣ የገበያ ቦታውን ወይም የሕጉን ለውጦች ለማንጸባረቅ እነዚህን ውሎች ሊያዘምን
              ይችላል። ከዚህ ገጽ አናት ላይ ያለው የሚፀናበት ቀን እና እትም የአሁኑን እትም ያሳያል። ለውጥ ነባር
              ተጠቃሚን በከፍተኛ ሁኔታ ሲነካ በአገልግሎቱ፣ በኢሜይል ወይም በሌላ ተገቢ መንገድ ማሳወቂያ እንሰጣለን።
              ሕጉ ወይም የተፈረመ ስምምነት ቀድሞ ስምምነት ካልጠየቀ በስተቀር አዲስ እትም ከሚፀናበት ቀን ጀምሮ
              ለወደፊቱ ተግባራዊ ይሆናል።
            </p>
          ),
        },
        {
          id: "governing-law",
          title: "የሚገዛው ሕግ እና የክርክር መድረክ",
          content: (
            <>
              <p>
                እነዚህ ውሎች እና የYeKis አጠቃቀም በኢትዮጵያ ሕግጋት ይገዛሉ። በገበያ ቦታ ተጠቃሚ እና በYeKis
                መካከል የሚነሳ እና በድጋፍ ሊፈታ የማይችል ክርክር ተዋዋይ ወገኖች በግልግል ወይም በሌላ ሕጋዊ
                መድረክ ካልተስማሙ በስተቀር ሥልጣን ላላቸው የአዲስ አበባ ፍርድ ቤቶች ሊቀርብ ይችላል። ምንም
                ነገር አንድ ወገን ሕጋዊ ሥልጣን ያለውን ተቆጣጣሪ ወይም ባለሥልጣን እንዳያነጋግር አያግደውም።
              </p>
              <p>
                በደንበኛ እና በባለሙያ መካከል ያለ ክርክር በመጀመሪያ በተፈረመው የአገልግሎት ስምምነት ውስጥ ያለውን
                የክርክር ሂደት ይከተላል። ግልግል ዳኝነት ተቆጣጣሪን፣ የፋይናንስ ደህንነት ባለሥልጣንን ወይም የሕግ
                አስከባሪ አካልን የማሳወቅ አስገዳጅ መብትን አያስቀርም።
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "መገኛ አድራሻ",
          content: (
            <p>
              YeKis መቀመጫውን በአዲስ አበባ፣ ኢትዮጵያ ያደረገ ነው። ለመለያ ወይም ለገበያ ቦታ ድጋፍ{" "}
              <a href="mailto:support@yekis.com">support@yekis.com</a> ላይ ኢሜይል ያድርጉ። ለግላዊነት
              ጥያቄዎች <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>ን ይጠቀሙ። የተመዘገበ
              ጉዳይ ወይም ከመለያዎ ጋር የተያያዘ ምላሽ ለሚፈልግ ጉዳይ በመተግበሪያው ውስጥ ያለውን የድጋፍ ቢሮ ይጠቀሙ።
            </p>
          ),
        },
      ],
    };
  }

  if (language === "om") {
    return {
      effectiveDate: "13 Sadaasa 2026",
      eyebrow: "Seeraa fi Amanamummaa",
      title: "Waliigaltee Tajaajilaa (Terms)",
      summary:
        "Seerota akkaataa maamiltoonni, ogeeyyiin fi YeKis gabaa kana itti fayyadaman, waliigaltee seenan, boqonnaa kaffalan, falmii furanii fi tajaajilicha eegan bulchan.",
      sections: [
        {
          id: "agreement",
          title: "Waliigaltee fi ulaagaa dandeettii",
          content: (
            <>
              <p>
                Haalli Tajaajilaa kun itti fayyadama marsariitii YeKis, bakka hojii weebii,
                Telegram Mini App, bootii, tajaajila deeggarsaa fi gabaa hojii irratti isinii fi
                YeKis gidduutti waliigaltee seeraan dirqisiisaa ta'e uuma. Herrega uumuu ykn
                tajaajilicha fayyadamuun Haala kanaa fi{" "}
                <button
                  type="button"
                  className="legal-inline-link"
                  onClick={() => onNavigate("privacy")}
                >
                  Imaammata Mateenyaa
                </button>
                {" "}ni fudhattu.
              </p>
              <p>
                Yoo xiqqaate umriin keessan waggaa 18 ta'uu, seeraan waliigaltee seenuu
                danda'uu fi bakka itti fayyadamni tajaajilichaa seera-qabeessa ta'etti argamuu
                qabdu. Yoo dhaabbata tokkoof fayyadamtan, dhaabbaticha bakka bu'uuf aangoo
                qabaachuu keessan mirkaneessitu.
              </p>
            </>
          ),
        },
        {
          id: "platform-role",
          title: "YeKis gabaa hojiiti malee qacaraa ykn bakka bu'aa keessan miti",
          content: (
            <>
              <p>
                YeKis teeknooloojii fi adeemsa maamiltootaa fi ogeeyyii walqunnamsiisu dhiyeessa.
                YeKis qacaraa, ejensii hojjetaa qacaru ykn bakka bu'aa seeraa garee kamiyyuu
                miti. Maamiltoonni fi ogeeyyiin dirqama gibiraa, hayyamaa, inshuraansii fi seeraa
                hojii isaanii waliin walqabatuuf of danda'anii itti gaafatamoodha.
              </p>
              <p>
                YeKis argama herregaa, to'annoo eenyummaa fi daldalaa, waliigaltee, maallaqa
                boqonnaa, galmee kaffaltii, falmii fi deeggarsa bulcha. Hariiroon daldalaa hojii
                sanaaf jiru maamilaa fi ogeessa gidduudha.
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "Herrega, argama fi mirkaneessa eenyummaa",
          content: (
            <>
              <p>
                Odeeffannoo galmee fi piroofaayilii sirrii kennuu, haaressuu fi YeKis barreeffamaan
                yoo hayyame malee herrega tokko qofa fayyadamuu qabdu. Sochii herrega keessanii
                fi icciitii jecha icciitii eeguuf itti gaafatamummaa qabdu.
              </p>
              <p>
                YeKis hojii maxxansuu, dorgomuu, waliigaltee seenuu, maallaqa galchuu ykn baasuun
                dura mirkaneessa bilbilaa, imeelii, eenyummaa ykn Fayda gaafachuu danda'a.
                Odeeffannoo fi sanada dhugaa qofa dhiyeessuu qabdu. Mirkaneessi amanamummaa
                ykn raawwii fuulduraaf wabii miti.
              </p>
            </>
          ),
        },
        {
          id: "marketplace-content",
          title: "Qabiyyee gabaa keessanii",
          content: (
            <>
              <p>
                Abbummaa qabiyyee dhiyeessitanii ni eeggattu. Tajaajilicha hojjechiisuu, daldala
                bulchuu, miidhaa ittisuu fi seera kabajuuf hanga barbaachisutti YeKis qabiyyee
                sana akka keessummeessu, mul'isuu fi dabarsuuf hayyama daangeffamaa kennitu.
              </p>
              <p>
                Qabiyyee sana dhiyeessuuf mirga qabaachuu keessanii fi mirga nama biraa akka hin
                tuqne mirkaneessitu. Hayyama malee icciitii nama biraa, waraqaa eenyummaa ykn
                ragaa kaffaltii hin galchinaa.
              </p>
            </>
          ),
        },
        {
          id: "prohibited-use",
          title: "Gochaalee dhorkaman",
          content: (
            <>
              <p>YeKis wantoota kanaaf fayyadamuu hin qabdan:</p>
              <ul>
                <li>Hojii seeraan alaa, meeshaa hatame, wantoota miidhaa geessisan ykn tajaajila mirga namaa sarbu gaafachuu ykn dhiyeessuu.</li>
                <li>Gowwoomsaa raawwachuu, sanada eenyummaa ykn KYC sobaa uumuu, nama biraa fakkaachuu ykn madaallii sobaan dabaluu.</li>
                <li>Nama biraa rakkisuu, doorsisuu, loogii gochuu ykn saamuu.</li>
                <li>Maalweerii, koodii miidhaa geessisu ykn qabiyyee mirga waraabbii (copyright) cabsu fe'uu.</li>
                <li>Daataa hatuun (scraping), reverse engineer gochuu ykn daangaa nageenyaa cabsuuf yaaluu.</li>
                <li>Herrega nama biraa fayyadamuu, gurguruu ykn sadarkaa mirkaneessaa dabarsuu.</li>
                <li>Kaffaltii waltajjii fi eegumsa YeKis jalaa miliquuf daldala waltajjii alatti baasuu.</li>
                <li>Hojii hin hayyamamneef ykn hin raawwatamneef maallaqa baasuu ykn deebisaa gaafachuu.</li>
                <li>Ergaa jumlaa hin hayyamamne (spam) erguu.</li>
              </ul>
            </>
          ),
        },
        {
          id: "jobs-and-gigs",
          title: "Hojiiwwan, yaadota dorgommii fi tajaajila giigii",
          content: (
            <>
              <p>
                Maamiltoonni ibsa ifa ta'e, baajata, yeroo fi haala boqonnaa waliin hojii
                maxxansuu danda'u. Ogeeyyiin yoo hojicha hojjechuu danda'an qofa yaada
                dorgommii dhiyeessu. Yaadni dorgommii, ajajni ykn ergaan kallattii tarkaanfii
                fudhatamuu, mallattoo fi maallaqa galchuu bakka hojiitti mul'atu hanga xumuruutti
                waliigaltee hin ta'u.
              </p>
              <p>
                Erga fudhatamee booda waliigalteen mallattaa'e, haalli boqonnaa fi Haalli kun
                hojicha bulchu. YeKis qabiyyee seera kana cabsu haquu danda'a.
              </p>
            </>
          ),
        },
        {
          id: "contracts",
          title: "Waliigaltee fi walii galtee tajaajilaa",
          content: (
            <>
              <p>
                Yeroo gareen yaada hojii fudhatan, YeKis daangaa hojii, gatii, tarree boqonnaa,
                mallattoo fi haala waliigaltee galmeessa. Garri kamiyyuu osoo hin mallatteessin
                ykn kaffaltii hin galchin dura waliigalticha dubbisuu qaba.
              </p>
              <p>
                Bakka waliigalteen mallattaa'e Haala kana waliin walitti bu'utti, hanga
                seera-qabeessa ta'etti waliigalteen mallattaa'e hojii sanaaf dursa qabaata.
              </p>
            </>
          ),
        },
        {
          id: "milestone-funding",
          title: "Maallaqa boqonnaa galchuu fi eegumsa kaffaltii",
          content: (
            <>
              <p>
                Boqonnaa tokkoof maallaqa galchuun hanga jedhame sirna kaffaltii fi galmee YeKis
                keessatti boqonnaa sanaaf qooda. Maallaqni waan galeef qofa ogeessaaf hin
                gadhiifamu; ogeessi hojicha raawwatee dhiyeessuu fi adeemsa gamaaggamaa hordofuu qaba.
              </p>
              <p>
                Adeemsi boqonnaa YeKis eegumsa gabaa hojiiti malee wabii raawwii, murtoo falmii
                murtaa'e ykn imaammata inshuraansii miti. Kaffaltiin qorannoo gowwoomsaa, dhorka
                seeraa fi hir'ifama dirqamaaf bitama.
              </p>
            </>
          ),
        },
        {
          id: "acceptance-and-release",
          title: "Fudhachuu, gadhiisa ofumaa fi yeroo haquu (Cooling-off)",
          content: (
            <>
              <p>
                Erga ogeessi hojii dhiyeessee booda, maamilli akka idileetti fudhachuu ykn falmii
                kaasuuf guyyoota kalaandarii torba (7) qaba. YeKis daangaan yeroo gadhiisa ofumaa
                osoo hin ga'in akeekkachiisa erga. Yoo maamilli tarkaanfii hin fudhannee fi
                dhorkni seeraa ykn falmii hin jiru ta'e, boqonnaan ofumaan gadhiifamuu danda'a.
              </p>
              <p>
                Yeroo hayyamame keessatti falmii kaasuun gadhiisa ofumaa dhaaba. Hojichi osoo hin
                jalqabin haalawwan guutaman jalaa maamilli mirga haquu guyyaa torbaa fayyadamuu danda'a.
              </p>
            </>
          ),
        },
        {
          id: "fees-and-taxes",
          title: "Kaffaltii, gibira fi baasii dhiyeessaa kaffaltii",
          content: (
            <>
              <p>
                Kaffaltiin daldala dura mul'atu daldala sana to'ata. Moodeelli YeKis ammaa boqonnaa
                ogeessaa gadhiifame irraa kaffaltii waltajjii %7 fudhata, maamila irraa immoo
                kaffaltii galchii dabalataa hin fudhatu. Dhiyeessaan kaffaltii baasii isaa
                addaan baasee fudhachuu danda'a. Tarree ammaa{" "}
                <button
                  type="button"
                  className="legal-inline-link"
                  onClick={() => onNavigate("fees")}
                >
                  Fuula Kaffaltii
                </button>{" "}
                irratti ilaalaa.
              </p>
              <p>
                YeKis kaffaltii fuulduraaf fooyyessuu danda'a; garuu waliigaltee kanaan dura
                maallaqni itti gale irratti duubatti hin deebi'u. YeKis gibira ykn hir'ifama
                seeraan gaafatamu kutuu danda'a; fayyadamtoonni dirqama gibira isaaniif itti gaafatamu.
              </p>
            </>
          ),
        },
        {
          id: "wallet-and-payouts",
          title: "Wallet, baasii fi itti gaafatamummaa fudhattuu",
          content: (
            <>
              <p>
                Maallaqni boqonnaa gadhiifame wallet YeKis ogeessaatti galmaa'a. Baasuuf
                ulaagaa mirkaneessaa guutuu fi bakka barbaachisutti koodii SMS dhaan mirkaneessuu
                qabdu. YeKis yaalii, bu'aa fi kaffaltii hunda ni galmeessa.
              </p>
              <p>
                Teessoo kaffaltii sirrii kan keessan ykn seeraan hayyamame kennuu qabdu.
                Odeeffannoo dogoggoraa abbaan herregaa mirkaneesseef YeKis itti hin gaafatamu.
                Wallettiin hafeensa gabaati malee herrega kuusaa baankii dhala argamsiisu miti.
              </p>
            </>
          ),
        },
        {
          id: "disputes",
          title: "Furmaata falmii",
          content: (
            <>
              <p>
                Falmiin boqonnaa maallaqni itti gale ykn ajaja giigii murtaa'e ilaallata.
                Adeemsichi marii irraa gara ragaa, araaraa fi bakka barbaachisutti jaarsummaatti
                (arbitration) deema. Gareen lamaanuu ragaa dhugaa dhiyeessuu fi yeroo kaa'ame
                keessatti deebisuuf dirqamu.
              </p>
              <p>
                YeKis waliigaltee, kaffaltii, dhiyeessii, ergaa fi galmee oodiitii qoratee
                maallaqicha gadhiisuu, deebisuu ykn qooduu danda'a. Yoo araarri hin furre,
                waliigalteen mallattaa'e seera Jaarsummaa fi Araaraa Itoophiyaa fi qajeelfama
                AACCSA jalatti Finfinneetti jaarsummaa akka raawwatu ibsa.
              </p>
              <p>
                Himannaa sobaa dhiyeessuun ykn ragaa dhoksuun tarkaanfii herregaa fida.
              </p>
            </>
          ),
        },
        {
          id: "reviews",
          title: "Madaallii fi maqaa gaarii",
          content: (
            <>
              <p>
                Madaallii fi sadarkaan muuxannoo garee biroo agarsiisa malee wabii YeKis miti.
                Madaalliin dhugaa, barbaachisaa fi arrabsoo ykn odeeffannoo dhuunfaa irraa
                bilisa ta'uu qaba. YeKis madaallii sobaa ykn seera cabsu dhoksuu ykn haquu danda'a.
              </p>
            </>
          ),
        },
        {
          id: "intellectual-property",
          title: "Qabeenya sammuu fi abbummaa hojii",
          content: (
            <>
              <p>
                Gareen kamiyyuu qabeenya sammuu hojii dura qabu ni eeggata. Waliigalteen
                mallattaa'e addaan yoo ibse malee, kaffaltiin boqonnaa mirga bu'aa hojii
                boqonnaa sanaaf kaffalamee gara maamilaatti dabarsa. Meeshaalee bu'uuraa fi
                beekumsi duraanii abbaa jalqabaa bira tura.
              </p>
              <p>
                Ogeessi hayyama maamilaatiin ala meeshaa maamilaa poortifooliyoo keessa galchuu
                hin qabu. YeKis qabiyyee gabaa keessummeessuu qofaan abbummaa hin gaafatu.
              </p>
            </>
          ),
        },
        {
          id: "confidentiality",
          title: "Iccitii fi mateenyaa",
          content: (
            <>
              <p>
                Maamiltoonni fi ogeeyyiin odeeffannoo ifa hin taane tajaajila keessaan argatan
                icciitiin eeguu fi hojichuma qofaaf oolchuu qabu. Daataan dhuunfaa akkaataa
                Imaammata Mateenyaatiin qabamu.
              </p>
            </>
          ),
        },
        {
          id: "communications",
          title: "Quunnamtii, beeksisa fi deeggarsa",
          content: (
            <>
              <p>
                YeKis beeksisa nageenyaa, waliigaltee, kaffaltii fi seeraa imeelii, SMS,
                beeksisa appii ykn Telegramiin erguu danda'a. Falmiin qulqullina hojii ykn
                maallaqaa adeemsa falmii bakka hojii keessatti dhiyaachuu qaba.
              </p>
            </>
          ),
        },
        {
          id: "suspension-and-termination",
          title: "Dhorkuu, cufuu fi addaan kutuu",
          content: (
            <>
              <p>
                Yeroo hafeensi wallet, kaffaltiin eegamu, waliigalteen hojjechaa jiru ykn falmiin
                banaa hin jirreetti herrega keessan cufuu dandeessu. Dirqamoonni cufamuu dura
                uuman itti fufu.
              </p>
              <p>
                YeKis yeroo gowwoomsaa, rakkoo eenyummaa ykn cabsa Haala kanaa qoratu argama
                dhorkuu ykn cufuu danda'a. Dhorkuun daldala hin haqu ykn seeraan ala maallaqa hin gadhiisu.
              </p>
            </>
          ),
        },
        {
          id: "warranties-and-liability",
          title: "Wabii, dhiifama fi itti gaafatamummaa",
          content: (
            <>
              <p>
                YeKis hanga seerri hayyamutti tajaajilicha haala "akkuma argametti" dhiyeessa.
                Tajaajilli addaan citii malee akka hojjetu ykn qaamni sadaffaan yeroo hunda
                akka argamu wabii hin kennu. Kasaaraa al-kallattiif seerri hanga hayyamutti itti
                hin gaafatamu; garuu mirgoonni dirqamaa eegumsa fayyadamtootaa hin haqaman.
              </p>
            </>
          ),
        },
        {
          id: "indemnity",
          title: "Beenyaa (Indemnity)",
          content: (
            <p>
              Hanga seerri hayyamutti, cabsa Haala kanaa, sarbama mirga nama biraa ykn
              odeeffannoo sobaa irraa kan ka'e himannaa fi kasaaraa uumamuuf YeKis fi
              hojjetaa isaa beenyaa kaffaluuf walii galtu.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Jijjiirama Haala kanaa",
          content: (
            <p>
              YeKis Haala kana fuulduraaf fooyyessuu danda'a. Jijjiirama guddaa fayyadamtoota
              miidhuuf beeksisa imeeliin ykn tajaajila keessaan kennina.
            </p>
          ),
        },
        {
          id: "governing-law",
          title: "Seera bulchuu fi iddoo falmii",
          content: (
            <>
              <p>
                Haalli kun seera Itoophiyaatiin bula. Falmiin deeggarsaan hin hiikamne manneen
                murtii aangoo qaban Finfinneetti dhiyaata, yoo jaarsummaan walii hin galle.
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "Quunnamtii",
          content: (
            <p>
              YeKis Finfinnee, Itoophiyaa keessatti argama. Deeggarsa herregaaf{" "}
              <a href="mailto:support@yekis.com">support@yekis.com</a>, gaaffii mateenyaaf{" "}
              <a href="mailto:privacy@yekis.com">privacy@yekis.com</a> irratti barreessaa.
            </p>
          ),
        },
      ],
    };
  }

  if (language === "ti") {
    return {
      effectiveDate: "13 ሕዳር 2026",
      eyebrow: "ሕግን እምነትን",
      title: "ውዕል ኣገልግሎት (Terms)",
      summary:
        "ዓማዊል፣ ክኢላታትን YeKisን ነዚ ዕዳጋ ስራሕ ከመይ ከም ዝጥቀሙ፣ ስምምዓት ከመይ ከም ዝኣስሩ፣ ምዕራፋት ብገንዘብ ከም ዝድግፉን ክትዓት ከም ዝፈትሑን ዝገዝኡ ሕግታት።",
      sections: [
        {
          id: "agreement",
          title: "ስምምዕን ብቕዓትን",
          content: (
            <>
              <p>
                እዞም ውዕላት ኣገልግሎት መርበብ ሓበሬታ YeKis፣ ናይ ዌብ መድረኽ፣ Telegram Mini App፣
                ቦት፣ ኣገልግሎታት ደገፍን ዕዳጋን ንምጥቃም ኣብ መንጎኹምን YeKisን ዝምስረት ቀያዲ ስምምዕ
                እዮም። ኣካውንት ብምኽፋት ወይ ብምጥቃም ነዞም ውዕላትን{" "}
                <button
                  type="button"
                  className="legal-inline-link"
                  onClick={() => onNavigate("privacy")}
                >
                  ፖሊሲ ብሕትውናን
                </button>
                {" "}ትቕበሉ።
              </p>
              <p>
                ብውሑድ 18 ዓመት ዝመላእኩምን ብሕጊ ቀያዲ ውዕል ክትኣስሩ እትኽእሉን ክትኮኑ ኣለኩም።
                ንትካል እትጥቀሙ እንተኾንኩም ነቲ ትካል ብሕጊ ናይ ምውካል ስልጣን ከም ዘለኩም ተረጋግጹ።
              </p>
            </>
          ),
        },
        {
          id: "platform-role",
          title: "YeKis ዕዳጋ ስራሕ እምበር ቆጻሪኹም ወይ ወኪልኩም ኣይኮነን",
          content: (
            <>
              <p>
                YeKis ዓማዊልን ክኢላታትን ዘራኽብ ቴክኖሎጂን መስርሕ ስራሕን የቕርብ። YeKis ናይ ዝኾነ
                ወገን ቆጻሪ፣ ኤጀንሲ ወይ ሕጋዊ ወኪል ኣይኮነን። ዓማዊልን ክኢላታትን ንግብሪ፣ ፍቓድ፣
                ኢንሹራንስን ሕጋዊ ግቡኣትን ባዕሎም ዝሓቱ ነጻ ተወዓዓልቲ እዮም።
              </p>
              <p>
                YeKis ምሕደራ ኣካውንት፣ መረጋገጺ መንነት፣ ውዕላት፣ ምዕራፋት ክፍሊት፣ ክትዓትን ደገፍን
                የካይድ። ንግዳዊ ርክብ እቲ ስራሕ ኣብ መንጎ ዓሚልን ክኢላን እዩ።
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "ኣካውንታት፣ መእተውን መረጋገጺ መንነትን",
          content: (
            <>
              <p>
                ቅኑዕ ሓበሬታ ምዝገባን ፕሮፋይልን ክትህቡን YeKis ብጽሑፍ እንተዘይፈቒዱ ሓደ ኣካውንት
                ጥራይ ክትጥቀሙን ኣለኩም። ኣብ ትሕቲ ኣካውንትኩም ዝግበር ምንቅስቓስን ምስጢር መሕለፊ
                ቃልን ባዕልኹም ትሕልዉ።
              </p>
              <p>
                YeKis ቅድሚ ስራሕ ምውሳኽ፣ ምሕታት፣ ውዕል ምእሳር ወይ ገንዘብ ምውጻእ መረጋገጺ ስልኪ፣
                ኢሜይል፣ መንነት ወይ ፋይዳ ክሓትት ይኽእል። ሓቀኛ ሰነዳት ጥራይ ኣቕርቡ። መረጋገጺ
                ንብቕዓት ወይ ተኣማንነት ውልቀሰብ ፍጹም ውሕስነት ኣይኮነን።
              </p>
            </>
          ),
        },
        {
          id: "marketplace-content",
          title: "ትሕዝቶ ዕዳጋኹም",
          content: (
            <>
              <p>
                ዋንነት ናይቲ እተቕርብዎ ትሕዝቶ ናትኩም ይኸውን። ነቲ ኣገልግሎት ንምክያድን ሕጊ
                ንምኽባርን ዘድሊ ውሱን ፍቓድ ምዕቃብን ምርኣይን ንYeKis ትህቡ።
              </p>
              <p>
                መሰል ካልኦት ዘይጥሕስን ቅኑዕን ትሕዝቶ ምዃኑ ተረጋግጹ። ዘይተፈቕደልኩም ምስጢራዊ
                ሓበሬታ ወይ ሰነድ መንነት ካልእ ሰብ ኣይተእትዉ።
              </p>
            </>
          ),
        },
        {
          id: "prohibited-use",
          title: "ዝተኸልከሉ ተግባራት",
          content: (
            <>
              <p>ንYeKis ነዞም ዝስዕቡ ምጥቃም ክልኩል እዩ፡</p>
              <ul>
                <li>ዘይሕጋዊ ስራሕ፣ ዝተሰረቑ ኣቕሑ ወይ መሰል ካልኦት ዝጥሕስ ኣገልግሎት ምሕታት ወይ ምቕራብ።</li>
                <li>ምትላል፣ ሰነድ መንነት ወይ KYC ምስናዕ፣ ካልእ ሰብ ምምሳል ወይ ግምገማ ምጭብርባር።</li>
                <li>ምፍርራሕ፣ ምድላው፣ ኣድልዎ ወይ ምዝመዛ ካልኦት ሰባት።</li>
                <li>ማልዌር፣ ጎዳኢ ኮድ ወይ መሰል ቅዳሕ (copyright) ዝጥሕስ ፋይል ምጽዓን።</li>
                <li>ዳታ ምስራቕ (scraping)፣ reverse engineer ምግባር ወይ ድሕነት መድረኽ ምጥሓስ።</li>
                <li>ኣካውንት ካልእ ሰብ ምጥቃም፣ ምሻጥ ወይ መረጋገጺ ምምሕልላፍ።</li>
                <li>ክፍሊትን ሓለዋን YeKis ንምህዳም ግብይት ካብ መድረኽ ወጻኢ ምውጻእ።</li>
                <li>ንዘይተሰርሐ ወይ ዘይተፈቕደ ስራሕ ገንዘብ ንምውጻእ ምፍታን።</li>
                <li>ዘይተፈቕደ ጅምላ መልእኽቲ (spam) ምልኣኽ።</li>
              </ul>
            </>
          ),
        },
        {
          id: "jobs-and-gigs",
          title: "ስራሕቲ፣ ፕሮፖዛላትን ፓኬጃት ኣገልግሎትን",
          content: (
            <>
              <p>
                ዓማዊል ብንጹር መግለጺ፣ ባጀትን ግዜን ስራሕ ክውስኹ ይኽእሉ። ክኢላታት ነቲ ስራሕ
                ክዓዩ ዝኽእሉ ምስ ዝኾኑ ጥራይ ፕሮፖዛል የቕርቡ። ምቕባል፣ ፊርማን ምእታው ገንዘብን
                ክሳብ ዝዛዘም ፕሮፖዛል ወይ ቻት ውዕል ኣይከውንን።
              </p>
              <p>
                ድሕሪ ምቕባል ዝተፈረመ ስምምዕ ኣገልግሎት፣ ቅጥዒ ምዕራፍን እዞም ውዕላትን ነቲ ስራሕ
                ይገዝኡ። YeKis ነዞም ውዕላት ዝጥሕስ ትሕዝቶ ከልግስ ይኽእል።
              </p>
            </>
          ),
        },
        {
          id: "contracts",
          title: "ውዕላትን ስምምዕ ኣገልግሎትን",
          content: (
            <>
              <p>
                ፕሮፖዛል ምስ ተቐበለ፣ YeKis ስፍሓት ስራሕ፣ ዋጋ፣ መደብ ምዕራፋትን ፊርማን ይምዝግብ።
                ነፍሲ ወከፍ ወገን ቅድሚ ምፍራሙ ወይ ምኽፋሉ ነቲ ስምምዕ ከንብብ ኣለዎ።
              </p>
              <p>
                ዝተፈረመ ስምምዕ ምስዞም ውዕላት እንተተጋጭዩ፣ ብሕጊ ክሳብ ዝፍቀድ ነቲ ስራሕ
                ዝተፈረመ ስምምዕ ይቅድም።
              </p>
            </>
          ),
        },
        {
          id: "milestone-funding",
          title: "ምምዋል ምዕራፍን ሓለዋ ክፍሊትን",
          content: (
            <>
              <p>
                ምዕራፍ ምምዋል ነቲ ዝተገለጸ መጠን ኣብ ስርዓት ክፍሊት YeKis ነቲ ምዕራፍ ይምድብ።
                ክፍሊት ስለ ዝተኣተወ ጥራይ ንኽኢላ ኣይፍኖን፤ ስራሕ ክፍጸምን ክርከብን ኣለዎ።
              </p>
              <p>
                መስርሕ ምዕራፍ YeKis ሓለዋ ዕዳጋ እምበር ውሕስነት ኣፈጻጽማ ወይ ኢንሹራንስ ኣይኮነን።
                ክፍሊታት ብምርመራ ምትላል፣ ሕጋዊ ምእጋድን ግዴታዊ ተቐናሽን ይግዝኡ።
              </p>
            </>
          ),
        },
        {
          id: "acceptance-and-release",
          title: "ምቕባል፣ ብቐጥታ ምፍናውን ግዜ ምዝሓልን (Cooling-off)",
          content: (
            <>
              <p>
                ክኢላ ስራሕ ምስ ኣረከበ፣ ዓሚል ብልምዲ ንምቕባል ወይ ክትዕ ንምልዓል ሸውዓተ (7)
                መዓልታት ኣለዎ። YeKis ቅድሚ ምብቃዕ ግዜኡ መጠንቀቕታ ይልእኽ። ዓሚል ስጉምቲ
                እንተዘይወሲዱን ዝኾነ ምእጋድ እንተዘየለን፣ እቲ ምዕራፍ ብቐጥታ ክፍኖ ይኽእል።
              </p>
              <p>
                ኣብ ግዜኡ ክትዕ ምልዓል ብቐጥታ ምፍናው ደው የብል። ስራሕ ከይተጀመረ ኩነታት
                ምስ ዝማልኡ ዓሚል ሕጋዊ ናይ 7 መዓልቲ ምስራዝ መሰሉ ክጥቀም ይኽእል።
              </p>
            </>
          ),
        },
        {
          id: "fees-and-taxes",
          title: "ክፍሊታት፣ ግብርን ክፍሊት ወሃቢ ክፍሊትን",
          content: (
            <>
              <p>
                ቅድሚ ግብይት ዝረአ ክፍሊት ነቲ ግብይት ይገዝእ። ናይ ሎሚ ሞዴል YeKis ካብ ዝተፈነወ
                ምዕራፍ ክኢላ 7% ክፍሊት መድረኽ ይወስድ፤ ካብ ዓሚል ግን ተወሳኺ ክፍሊት የለን።
                ወሃቢ ክፍሊት ናቱ ክፍሊት ከስዕብ ይኽእል። ዝተሓትመ ዋጋ ኣብ{" "}
                <button
                  type="button"
                  className="legal-inline-link"
                  onClick={() => onNavigate("fees")}
                >
                  ገጽ ክፍሊታት
                </button>{" "}
                ርአ።
              </p>
              <p>
                YeKis ንመጻኢ ክፍሊታት ከመሓይሽ ይኽእል፤ ኣብ ቅድሚኡ ዝተመወለ ውዕል ግን ኣይምለስን።
                YeKis ብሕጊ ዝሕተት ግብሪ ክቆርጽ ይኽእል፤ ተጠቀምቲ ንግብሮም ባዕሎም ይሕተቱ።
              </p>
            </>
          ),
        },
        {
          id: "wallet-and-payouts",
          title: "ዋሌት፣ ምውጻእ ገንዘብን ሓላፍነት ተቐባልን",
          content: (
            <>
              <p>
                ዝተፈነወ ክፍሊት ናብ ዋሌት YeKis ክኢላ ይኣቱ። ገንዘብ ንምውጻእ ቅጥዒ መረጋገጺ
                ምምላእን ብSMS ኮድ ምፍቃድን የድሊ። ናትኩም ወይ ብሕጊ ዝተፈቕደ ቅኑዕ መዓርፎ
                ክትህቡ ኣለኩም። ዋሌት ሚዛን ዕዳጋ እምበር ወለድ ዝወልድ ሕሳብ ባንኪ ኣይኮነን።
              </p>
            </>
          ),
        },
        {
          id: "disputes",
          title: "ምፍታሕ ክትዕ",
          content: (
            <>
              <p>
                ክትዕ ንሓደ ዝተመወለ ምዕራፍ ወይ ትእዛዝ ጊግ ይምልከት። መስርሑ ካብ ዘተ ናብ መርትዖ፣
                ዕርቅን ኣድላዪ እንተኾይኑ ናብ ሽምግልና (arbitration) ይኸይድ።
              </p>
              <p>
                YeKis ውዕል፣ ክፍሊት፣ ርክክብን መዝገብ ኦዲትን መርሚሩ ክፍኖ፣ ክምለስ ወይ ክምቀል
                ክውስን ይኽእል። ብዕርቂ እንተዘይተፈትሐ፣ ዝተፈረመ ውዕል ብኣዋጅ ሽምግልና ኢትዮጵያን
                ሕግታት AACCSAን ኣብ ኣዲስ ኣበባ ይፍታሕ።
              </p>
            </>
          ),
        },
        {
          id: "reviews",
          title: "ግምገማታትን ስምን",
          content: (
            <>
              <p>
                ግምገማታት ተመኩሮ ተጠቀምቲ የንጸባርቑ እምበር ውሕስነት YeKis ኣይኮኑን። ሓቀኛን
                ካብ ጸርፊ ዝጸረየን ክኸውን ኣለዎ። YeKis ሓሶት ወይ ሕጊ ዝጥሕስ ግምገማ ክሓብእ ይኽእል።
              </p>
            </>
          ),
        },
        {
          id: "intellectual-property",
          title: "ኣእምሮኣዊ ንብረትን ዋንነት ስራሕን",
          content: (
            <>
              <p>
                ነፍሲ ወከፍ ወገን ቅድሚ ስራሕ ዝነበሮ ኣእምሮኣዊ ንብረት ይሕሉ። ብኻልእ እንተዘይተገሊጹ፣
                ምዕራፍ ምኽፋል መሰል ናይቲ ዝተኸፈለሉ ውጽኢት ናብ ዓሚል የመሓላልፍ።
              </p>
            </>
          ),
        },
        {
          id: "confidentiality",
          title: "ምስጢራውነትን ብሕትውናን",
          content: (
            <>
              <p>
                ዓማዊልን ክኢላታትን ብመድረኽ ዝረኽብዎ ዘይህዝባዊ ሓበሬታ ብምስጢር ክሕዙን ነቲ
                ስራሕ ጥራይ ክጥቀሙን ኣለዎም። ውልቃዊ ዳታ ብፖሊሲ ብሕትውና ይተሓዝ።
              </p>
            </>
          ),
        },
        {
          id: "communications",
          title: "ርክባት፣ መፍለጥታትን ደገፍን",
          content: (
            <>
              <p>
                YeKis መፍለጥታት ብኢሜይል፣ SMS፣ መድረኽ ወይ ቴሌግራም ክልእኽ ይኽእል። ክትዕ
                ጽሬት ስራሕ ወይ ገንዘብ ኣብ ውሽጢ መስርሕ ክትዕ መድረኽ ክቀርብ ኣለዎ።
              </p>
            </>
          ),
        },
        {
          id: "suspension-and-termination",
          title: "ምእጋድ፣ ምዕጻውን ምቁራጽን",
          content: (
            <>
              <p>
                ዝተረፈ ገንዘብ፣ ዝጽበ ክፍሊት፣ ንጡፍ ውዕል ወይ ክፉት ክትዕ እንተዘየለ ኣካውንትኩም
                ክትዓጽዉ ትኽእሉ። YeKis ምትላል ወይ ጥሕሰት ውዕል ክምርምር ከሎ ኣካውንት ክዓግት
                ወይ ከቋርጽ ይኽእል።
              </p>
            </>
          ),
        },
        {
          id: "warranties-and-liability",
          title: "ውሕስነት፣ ክሕደትን ተሓታትነትን",
          content: (
            <>
              <p>
                YeKis ኣገልግሎቱ ሕጊ ክሳብ ዝፈቕዶ "ከም ዘለዎ" (as is) የቕርብ። ብቐጥታዊ ዘይኮነ
                ክሳራ ተሓታቲ ኣይኮነን፤ ብሕጊ ዝተረጋገጹ ግዴታዊ መሰላት ተጠቀምቲ ግን ይኽበሩ።
              </p>
            </>
          ),
        },
        {
          id: "indemnity",
          title: "ካሕሳ (Indemnity)",
          content: (
            <p>
              ሕጊ ክሳብ ዝፈቕዶ ብሰንኪ ከቢድ ጥሕሰት ውዕልኩም፣ ምጥሓስ መሰል ካልኦት ወይ ሓሶት
              ሓበሬታ ንዝለዓል ሕቶ ንYeKis ክትክሕሱ ትሰማምዑ።
            </p>
          ),
        },
        {
          id: "changes",
          title: "ለውጥታት እዞም ውዕላት",
          content: (
            <p>
              YeKis ነዞም ውዕላት ንመጻኢ ከመሓይሽ ይኽእል። ዓቢ ለውጢ እንተሃልዩ ብኣገልግሎት ወይ
              ኢሜይል መፍለጢ ይወሃብ።
            </p>
          ),
        },
        {
          id: "governing-law",
          title: "ዝገዝእ ሕግን ቦታ ክትዕን",
          content: (
            <>
              <p>
                እዞም ውዕላት ብሕጊ ኢትዮጵያ ይግዝኡ። ብደገፍ ዘይተፈትሐ ክትዕ ሽምግልና እንተዘይተመሪጹ
                ኣብ ኣብያተ ፍርዲ ኣዲስ ኣበባ ይቀርብ።
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "መራኸቢ",
          content: (
            <p>
              YeKis ኣብ ኣዲስ ኣበባ፣ ኢትዮጵያ ይርከብ። ንደገፍ{" "}
              <a href="mailto:support@yekis.com">support@yekis.com</a>፣ ንብሕትውና{" "}
              <a href="mailto:privacy@yekis.com">privacy@yekis.com</a> ተጠቐሙ።
            </p>
          ),
        },
      ],
    };
  }

  return {
    effectiveDate: "13 November 2026",
    eyebrow: "Legal and trust",
    title: "Terms of Service",
    summary:
      "The rules that govern how clients, freelancers, and Yekis use the marketplace, enter agreements, fund milestones, resolve disputes, and protect the service.",
    sections: [
      {
        id: "agreement",
        title: "Agreement and eligibility",
        content: (
          <>
            <p>
              These Terms of Service form a binding agreement between you and Yekis
              for your use of the Yekis website, web workspace, Telegram Mini App,
              bot, support services, and marketplace. By creating an account or using
              the service, you accept these Terms and the{" "}
              <button
                type="button"
                className="legal-inline-link"
                onClick={() => onNavigate("privacy")}
              >
                Privacy Policy
              </button>
              .
            </p>
            <p>
              You must be at least 18 years old, legally able to enter a binding
              contract, and located in a jurisdiction where use of the service is
              lawful. If you use Yekis for an organisation, you confirm that you have
              authority to bind that organisation and that the organisation accepts
              these Terms.
            </p>
          </>
        ),
      },
      {
        id: "platform-role",
        title: "Yekis is a marketplace, not your employer or agent",
        content: (
          <>
            <p>
              Yekis provides the technology and workflow that connect clients and
              freelancers. Yekis is not an employer, staffing agency, recruiter, or
              legal representative of either party. Clients and freelancers are
              independent contractors responsible for the taxes, permits, insurance,
              and legal obligations connected with their work, except where these
              Terms or a signed service agreement expressly provide otherwise.
            </p>
            <p>
              Yekis administers account access, identity and transaction controls,
              contracts, milestone funding, payment records, disputes, and support.
              The commercial relationship for the underlying work is between the
              client and freelancer.
            </p>
          </>
        ),
      },
      {
        id: "accounts",
        title: "Accounts, access, and identity verification",
        content: (
          <>
            <p>
              You must provide accurate registration and profile information, keep it
              current, and use only one account unless Yekis approves another in
              writing. You are responsible for activity under your account and for
              keeping your password and verification codes confidential. Tell
              support immediately if you believe your account or credentials have
              been compromised.
            </p>
            <p>
              Yekis may require phone, email, identity, Fayda, or other verification
              before you post, bid, contract, fund, receive, or withdraw. You must
              submit only genuine information and genuine documents belonging to you
              or, where permitted, your organisation. Verification is not a guarantee
              of a user&apos;s honesty, fitness for a contract, or future performance.
            </p>
          </>
        ),
      },
      {
        id: "marketplace-content",
        title: "Your marketplace content",
        content: (
          <>
            <p>
              You keep ownership of content you submit. You give Yekis a limited,
              non-exclusive, worldwide licence to host, process, display, reproduce,
              and transmit that content only as necessary to operate the service,
              administer transactions, prevent abuse, and comply with law.
            </p>
            <p>
              You confirm that you have the right to submit the content, that it is
              accurate, and that publishing it does not infringe another person&apos;s
              rights. Do not submit another person&apos;s confidential information,
              identity document, payment credential, or private communication unless
              you are authorised to do so.
            </p>
          </>
        ),
      },
      {
        id: "prohibited-use",
        title: "Prohibited conduct",
        content: (
          <>
            <p>You must not use Yekis to:</p>
            <ul>
              <li>Offer or request illegal work, stolen goods, harmful materials, deceptive investment products, or services that violate another person&apos;s rights.</li>
              <li>Commit fraud, falsify identity or KYC documents, impersonate another person, or misrepresent your qualifications, availability, reviews, or deliverables.</li>
              <li>Harass, threaten, discriminate against, stalk, or unlawfully exploit another person.</li>
              <li>Upload malware, malicious code, abusive content, or material that infringes copyright, privacy, confidentiality, or other rights.</li>
              <li>Scrape, reverse engineer, overload, probe, or attempt to bypass the service, its security controls, rate limits, or access restrictions.</li>
              <li>Use another person&apos;s account, share credentials, sell an account, or transfer verification status.</li>
              <li>Move a transaction off-platform or ask another user to do so to avoid fees, dispute records, or Yekis safeguards.</li>
              <li>Attempt to withdraw, refund, or obtain a payment for work that was not authorised, delivered, or payable under the accepted terms.</li>
              <li>Send unsolicited bulk messages, spam, or unlawful marketing communications.</li>
            </ul>
          </>
        ),
      },
      {
        id: "jobs-and-gigs",
        title: "Jobs, proposals, and service packages",
        content: (
          <>
            <p>
              Clients may post jobs with clear descriptions, budgets, deadlines, and
              milestone terms. Freelancers may submit proposals only when they are
              eligible and able to perform the work. Clients may accept a proposal or
              order a published gig package. A proposal, order, or direct message is
              not a contract until the parties complete the required acceptance,
              signature, and funding steps shown in the workspace.
            </p>
            <p>
              A client may withdraw or revise a proposal before acceptance where the
              workspace allows it. After acceptance, the signed service agreement,
              milestone terms, and these Terms govern the engagement. Yekis may
              remove content that violates these Terms or creates a legal or security
              risk.
            </p>
          </>
        ),
      },
      {
        id: "contracts",
        title: "Contracts and the service agreement",
        content: (
          <>
            <p>
              When the parties accept a proposal, Yekis records the agreed scope,
              price, milestone schedule, signatures, and service-agreement terms. The
              workspace copy is the operational record of that agreement. Each party
              should read the agreement and milestone terms before signing or
              funding.
            </p>
            <p>
              Where a signed service agreement conflicts with these Terms, the
              signed agreement controls for that engagement to the extent the
              conflict is lawful. These Terms continue to govern platform use,
              accounts, fees, disputes, confidentiality, and liability.
            </p>
          </>
        ),
      },
      {
        id: "milestone-funding",
        title: "Milestone funding and payment protection",
        content: (
          <>
            <p>
              Funding a milestone allocates the stated amount to that milestone in
              Yekis&apos;s payment and ledger systems. The amount is not released to
              the freelancer merely because it was funded. The freelancer must
              perform the agreed work, submit the delivery, and follow the review and
              dispute process.
            </p>
            <p>
              Yekis&apos; milestone process is a marketplace safeguard designed to
              prevent a freelancer from being paid without delivery and to prevent a
              client from holding submitted work indefinitely without a dispute. It
              is not a guarantee of performance, a promise of a particular dispute
              outcome, an insurance policy, or a representation that funds are held
              by a licensed bank in a separate trust account unless a payment or
              account document expressly says so.
            </p>
            <p>
              Payments remain subject to provider settlement, fraud checks, legal
              holds, and mandatory deductions. If Yekis cannot obtain a valid
              payment, verify it, or release it because of a legal or compliance
              hold, the affected milestone is not treated as released.
            </p>
          </>
        ),
      },
      {
        id: "acceptance-and-release",
        title: "Acceptance, automatic release, and cooling-off",
        content: (
          <>
            <p>
              After the freelancer submits a delivery, the client normally has seven
              calendar days to accept it or raise a dispute. Yekis sends a warning
              before the automatic-release deadline. If the client does not act and
              no legal, security, or dispute hold applies, the milestone may be
              released automatically at the end of that window.
            </p>
            <p>
              A party may raise a dispute within the period allowed by the workspace.
              Raising a timely dispute pauses the automatic release while the dispute
              is handled. A client may also exercise the statutory seven-day
              cooling-off cancellation right where the contract has not begun and the
              applicable conditions in the workspace are met.
            </p>
          </>
        ),
      },
      {
        id: "fees-and-taxes",
        title: "Fees, taxes, and payment-provider charges",
        content: (
          <>
            <p>
              The fee shown before a transaction controls that transaction. The
              current Yekis model charges a seven percent platform fee from the
              freelancer&apos;s released milestone amount and no client deposit
              surcharge. A payment or disbursement provider may also charge its own
              fee, which is disclosed where applicable. See the{" "}
              <button
                type="button"
                className="legal-inline-link"
                onClick={() => onNavigate("fees")}
              >
                Fees page
              </button>{" "}
              for the current published rates.
            </p>
            <p>
              Yekis may change fees prospectively. A change does not apply
              retroactively to a contract or milestone that has already been funded.
              Yekis may deduct or withhold amounts required by law, including tax,
              anti-money-laundering, court, or regulator requirements, and will
              provide the information available to the user for the deduction.
              Users remain responsible for their own tax obligations.
            </p>
          </>
        ),
      },
      {
        id: "wallet-and-payouts",
        title: "Wallet, withdrawals, and recipient responsibility",
        content: (
          <>
            <p>
              Released milestone amounts are credited to the freelancer&apos;s Yekis
              wallet. To withdraw, the freelancer must satisfy the verification,
              compliance, and account conditions shown in the wallet and must approve
              the specific payout, including by SMS code where required. Yekis sends
              payouts through the configured payment provider and records each
              attempt, result, and fee.
            </p>
            <p>
              You must provide a valid payout destination that belongs to or is
              lawfully authorised for you. Check the destination and amount before
              approving a withdrawal. Yekis is not responsible for loss caused by
              false information, an unauthorised device, or a payment to a wrong
              destination that was confirmed by the account holder. A wallet is a
              marketplace balance, not a bank deposit account, and does not earn
              interest unless Yekis expressly states otherwise.
            </p>
          </>
        ),
      },
      {
        id: "disputes",
        title: "Dispute resolution",
        content: (
          <>
            <p>
              A dispute concerns a specific funded milestone or gig order. The
              process moves from negotiation to evidence, mediation, and, where
              needed, arbitration. Both parties must provide truthful information,
              preserve relevant evidence, respond within the stated deadlines, and
              accept the outcome of the process they selected.
            </p>
            <p>
              Yekis may review the contract, payment state, delivery, messages,
              files, and audit history and may release, refund, or divide the
              milestone. A staff resolution is recorded in the ledger and audit
              trail. If mediation does not resolve the matter, the signed agreement
              provides for arbitration in Addis Ababa under the applicable
              Arbitration and Conciliation Proclamation and the rules of the named
              arbitration institution, including AACCSA where the agreement says so.
            </p>
            <p>
              A user must not file a false claim, conceal material evidence, or
              attempt to use a dispute to avoid a genuine obligation. Fraud or
              collusion connected to a dispute may lead to account action and other
              remedies.
            </p>
          </>
        ),
      },
      {
        id: "reviews",
        title: "Reviews and reputation",
        content: (
          <>
            <p>
              Reviews and ratings reflect a counterparty&apos;s experience. They are
              not a guarantee by Yekis, a certification of quality, or permission to
              publish private information. Reviews must be accurate, relevant, and
              free from harassment, threats, discrimination, or content that
              violates these Terms.
            </p>
            <p>
              A review that appears to be false, abusive, or manipulated can be
              reported for review. Yekis may hide, correct, or remove a review
              where its terms or content rules require that action and will preserve
              the review history where a legal or audit obligation applies.
            </p>
          </>
        ),
      },
      {
        id: "intellectual-property",
        title: "Intellectual property and work ownership",
        content: (
          <>
            <p>
              Each party keeps the intellectual property it owned before the
              engagement. Except as the signed service agreement states otherwise,
              payment of a milestone releases to the client the agreed rights in the
              bespoke deliverables paid for under that milestone. Rights not paid
              for, source materials, tools, templates, know-how, and pre-existing
              intellectual property remain with their original owner.
            </p>
            <p>
              A freelancer may include portfolio or pre-existing material only with
              the client&apos;s permission. Yekis may use submitted deliverables and
              portfolio material to operate the service, including displaying a
              public preview where the user chooses to publish it. Yekis does not
              claim ownership of marketplace content merely by hosting it.
            </p>
          </>
        ),
      },
      {
        id: "confidentiality",
        title: "Confidentiality and privacy",
        content: (
          <>
            <p>
              Clients and freelancers must keep non-public information received
              through the service confidential and use it only to perform the
              engagement. These confidentiality duties do not apply to information
              that is public, already lawfully known without restriction, independently
              developed, or lawfully received from another source.
            </p>
            <p>
              Personal data is handled under the Privacy Policy. Users must not
              misuse another person&apos;s data, scrape personal information, contact
              users for unrelated marketing, or upload special-category data that
              the engagement does not require.
            </p>
          </>
        ),
      },
      {
        id: "communications",
        title: "Communications, notices, and support",
        content: (
          <>
            <p>
              Yekis may send account, security, verification, contract, payment,
              delivery, dispute, and legal notices by email, SMS, in-app
              notification, Telegram message, or another method appropriate to the
              service. Keep your contact details current so notices reach you.
            </p>
            <p>
              Support is available through the in-app help desk and the contact
              channels shown on the website. A dispute about work quality, money, or
              contract performance belongs in the relevant workspace dispute flow so
              that both parties and Yekis have the required record. General support
              will not make binding financial or dispute decisions outside that flow.
            </p>
          </>
        ),
      },
      {
        id: "suspension-and-termination",
        title: "Suspension, closure, and termination",
        content: (
          <>
            <p>
              You may close your account when there is no wallet balance, pending
              payout or top-up, active contract, or open dispute. Closure ends access
              and revokes sessions. You remain responsible for fees, disputes, and
              obligations that arose before closure.
            </p>
            <p>
              Yekis may limit or suspend access while investigating fraud, identity
              concerns, security events, payment anomalies, legal requests, or a
              material breach of these Terms. Yekis may terminate an account for
              serious or repeated breach, unlawful use, impersonation, abuse of the
              payment system, or where continued operation is not lawful or safe.
              Where the reason is not urgent, Yekis will normally give notice and an
              opportunity to respond.
            </p>
            <p>
              Suspension does not erase a transaction or release money contrary to
              the contract, dispute rules, or law. Records subject to retention
              duties remain as described in the Privacy Policy.
            </p>
          </>
        ),
      },
      {
        id: "warranties-and-liability",
        title: "Warranties, disclaimers, and liability",
        content: (
          <>
            <p>
              Yekis provides the service on an "as available" and "as
              is" basis to the extent permitted by law. Yekis does not warrant
              that the service will be uninterrupted, that every user is honest or
              qualified, that a dispute will reach a particular result, or that a
              third-party provider will always be available. Users are responsible
              for assessing whether another party, work, payment method, or
              transaction is suitable for them.
            </p>
            <p>
              To the fullest extent permitted by law, Yekis is not responsible for
              indirect or consequential loss, loss of profit, loss of business
              opportunity, or damage arising from another user&apos;s conduct. Yekis
              is also not responsible for losses caused by your failure to secure
              your account, provide accurate information, or follow the contract and
              dispute deadlines.
            </p>
            <p>
              Nothing in these Terms excludes or limits liability or rights that
              cannot lawfully be excluded or limited, including rights under consumer
              protection, anti-money-laundering, or other mandatory law. Any
              exclusion applies only to the extent it is legally effective.
            </p>
          </>
        ),
      },
      {
        id: "indemnity",
        title: "Indemnity",
        content: (
          <p>
            To the extent permitted by law, you agree to indemnify Yekis and its
            personnel against claims, losses, and reasonable costs arising from
            your material breach of these Terms, infringement of another person&apos;s
            rights, unlawful content or conduct, fraudulent information, or a
            misrepresentation about your identity or authority. Yekis will notify
            you of a covered claim where reasonably practicable and allow you to
            participate in its defence.
          </p>
        ),
      },
      {
        id: "changes",
        title: "Changes to these Terms",
        content: (
          <p>
            Yekis may update these Terms to reflect changes to the service, the
            marketplace, or the law. The effective date and version at the top of this
            page identify the current version. We will provide notice through the
            service, email, or another appropriate channel when a change materially
            affects an existing user. A new version applies prospectively from its
            effective date, except where the law or a signed agreement requires
            agreement to a specific change before it takes effect.
          </p>
        ),
      },
      {
        id: "governing-law",
        title: "Governing law and dispute forum",
        content: (
          <>
            <p>
              These Terms and the use of Yekis are governed by the laws of Ethiopia.
              A dispute between a marketplace user and Yekis that cannot be resolved
              through support may be brought before the competent courts of Addis
              Ababa, unless the parties agree to arbitration or another lawful
              forum. Nothing prevents a party from contacting a regulator or
              authority with lawful jurisdiction.
            </p>
            <p>
              A dispute between a client and freelancer follows the dispute process
              in the signed service agreement first. Arbitration does not remove any
              mandatory right to notify a regulator, financial-intelligence
              authority, or law-enforcement body.
            </p>
          </>
        ),
      },
      {
        id: "contact",
        title: "Contact",
        content: (
          <p>
            Yekis is based in Addis Ababa, Ethiopia. For account or marketplace
            support, email{" "}
            <a href="mailto:support@yekis.com">support@yekis.com</a>. For privacy
            questions, use <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>.
            Use the in-app support desk for an issue that requires a recorded case or
            a reply tied to your account.
          </p>
        ),
      },
    ],
  };
}

export function TermsPage({ onNavigate }: TermsPageProps) {
  const { language } = useI18n();
  const copy = getTermsCopy(language, onNavigate);

  return (
    <LegalDocumentPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      summary={copy.summary}
      effectiveDate={copy.effectiveDate}
      sections={copy.sections}
      contactEmail="support@yekis.com"
      onNavigate={onNavigate}
    />
  );
}
