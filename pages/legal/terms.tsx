import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Link as MuiLink,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
  Breadcrumbs,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import GavelIcon from '@mui/icons-material/Gavel';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';

export default function TermsOfService() {
  const router = useRouter();
  const lastUpdated = '2025年12月7日';

  const sections = [
    {
      id: 'overview',
      title: '1. サービスの概要と定義',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            1.1 サービスの概要
          </Typography>
          <Typography paragraph>
            RevAI Concierge（以下「本サービス」といいます）は、Google
            Businessのレビューに対するAI返信管理システムを提供するSaaS型サービスです。
            本サービスは、事業者の皆様がGoogle Business
            Profileに投稿されたレビューに対して、AIを活用した効率的かつ適切な返信を作成・管理することを支援します。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            1.2 定義
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="本サービス"
                secondary="RevAI Conciergeおよび関連するすべてのサービス、機能、コンテンツを指します。"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="利用者"
                secondary="本サービスに登録し、利用するすべての個人または法人を指します。"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="ユーザーアカウント"
                secondary="本サービスの利用に必要な、利用者固有の登録情報およびアクセス権限を指します。"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="コンテンツ"
                secondary="本サービスを通じて投稿、保存、または送信されるすべてのテキスト、画像、データ、情報を指します。"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="サブスクリプション"
                secondary="本サービスの有料プランおよび継続的な利用権を指します。"
              />
            </ListItem>
          </List>
        </>
      ),
    },
    {
      id: 'account',
      title: '2. アカウント登録と責任',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            2.1 アカウント登録
          </Typography>
          <Typography paragraph>
            本サービスを利用するには、正確かつ最新の情報を提供してアカウントを登録する必要があります。
            登録情報に変更があった場合は、速やかに更新してください。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            2.2 アカウント管理責任
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="利用者は、アカウントのログイン情報（メールアドレス、パスワード等）を厳重に管理する責任を負います。" />
            </ListItem>
            <ListItem>
              <ListItemText primary="アカウント情報の不正使用や第三者による使用が判明した場合は、直ちに当社に通知してください。" />
            </ListItem>
            <ListItem>
              <ListItemText primary="利用者のアカウントで行われたすべての活動について、利用者が責任を負います。" />
            </ListItem>
            <ListItem>
              <ListItemText primary="アカウントの譲渡、貸与、売買、その他の方法による第三者への提供は禁止されています。" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            2.3 登録資格
          </Typography>
          <Typography paragraph>
            本サービスは、18歳以上の個人または法人のみが登録できます。未成年者が登録する場合は、親権者または法定代理人の同意が必要です。
          </Typography>
        </>
      ),
    },
    {
      id: 'subscription',
      title: '3. サブスクリプションと支払い条件',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            3.1 料金プラン
          </Typography>
          <Typography paragraph>
            本サービスは、複数の料金プランを提供しています。各プランの詳細、機能、料金については、当社ウェブサイトに記載されています。
            料金は予告なく変更される場合があります。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            3.2 支払い方法
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="支払いは、クレジットカード（Stripe決済）により行われます。" />
            </ListItem>
            <ListItem>
              <ListItemText primary="サブスクリプション料金は、選択されたプランに応じて月次または年次で自動的に請求されます。" />
            </ListItem>
            <ListItem>
              <ListItemText primary="初回支払い後、自動更新により継続的に課金されます。" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            3.3 返金ポリシー
          </Typography>
          <Typography paragraph>
            サブスクリプション料金の返金は、原則として行いません。ただし、当社の過失による重大なサービス提供の不備がある場合は、この限りではありません。
            返金の可否および金額については、個別の状況に応じて当社が判断します。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            3.4 無料トライアル
          </Typography>
          <Typography paragraph>
            当社が無料トライアル期間を提供する場合、トライアル期間終了後は自動的に有料プランに移行します。
            トライアル期間中に解約しない限り、選択したプランの料金が請求されます。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            3.5 料金の変更
          </Typography>
          <Typography paragraph>
            当社は、30日前までに通知することにより、サブスクリプション料金を変更することができます。
            料金変更は、通知後の次回更新日から適用されます。
          </Typography>
        </>
      ),
    },
    {
      id: 'usage',
      title: '4. サービスの利用規則',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            4.1 適切な利用
          </Typography>
          <Typography paragraph>
            利用者は、本サービスを善良な管理者の注意をもって適切に利用するものとします。
            本サービスの利用にあたっては、関連するすべての法令、規則、規制を遵守してください。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            4.2 AIによる返信生成
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="本サービスはAIを使用してレビュー返信を生成しますが、生成された返信の内容について、利用者自身が確認・承認する責任を負います。" />
            </ListItem>
            <ListItem>
              <ListItemText primary="AIが生成した返信は参考情報であり、最終的な投稿判断は利用者が行います。" />
            </ListItem>
            <ListItem>
              <ListItemText primary="不適切または不正確な返信により生じた損害について、当社は責任を負いません。" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            4.3 データの取り扱い
          </Typography>
          <Typography paragraph>
            利用者は、本サービスを通じてアップロードまたは投稿するすべてのデータについて、適切な権利または許可を有していることを保証します。
            第三者の権利を侵害するデータの投稿は禁止されています。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            4.4 セキュリティ
          </Typography>
          <Typography paragraph>
            利用者は、本サービスのセキュリティを脅かす行為、または本サービスの正常な動作を妨げる行為を行ってはなりません。
            これには、ハッキング、不正アクセス、マルウェアの配布などが含まれます。
          </Typography>
        </>
      ),
    },
    {
      id: 'prohibited',
      title: '5. 禁止事項',
      content: (
        <>
          <Typography paragraph>
            利用者は、以下の行為を行ってはなりません。違反が確認された場合、当社は事前通知なくアカウントを停止または削除する権利を留保します。
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="1. 法令、公序良俗に違反する行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="2. 犯罪行為またはこれに関連する行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="3. 当社または第三者の知的財産権、肖像権、プライバシー権、名誉、その他の権利または利益を侵害する行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="4. 虚偽の情報を登録または提供する行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="5. 本サービスのネットワークまたはシステムに過度な負荷をかける行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="6. 本サービスのリバースエンジニアリング、逆コンパイル、逆アセンブル、その他のソースコード解析行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="7. 本サービスを利用して不正に利益を得る行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="8. スパム、フィッシング、その他の迷惑行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="9. 他の利用者のアカウントを不正に使用する行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="10. 本サービスの運営を妨害する行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="11. 反社会的勢力に対する利益供与その他の協力行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="12. 宗教活動または宗教団体への勧誘行為" />
            </ListItem>
            <ListItem>
              <ListItemText primary="13. その他、当社が不適切と判断する行為" />
            </ListItem>
          </List>
        </>
      ),
    },
    {
      id: 'ip',
      title: '6. 知的財産権',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            6.1 当社の知的財産権
          </Typography>
          <Typography paragraph>
            本サービスに関連するすべての知的財産権（商標、著作権、特許権、ノウハウ等を含みますがこれらに限られません）は、当社または当社にライセンスを許諾している第三者に帰属します。
            本規約は、利用者に対して本サービスの知的財産権のライセンスを付与するものではありません。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            6.2 利用者のコンテンツ
          </Typography>
          <Typography paragraph>
            利用者が本サービスに投稿または保存したコンテンツの知的財産権は、利用者または正当な権利者に帰属します。
            ただし、利用者は、当社に対して、本サービスの提供、運営、改善のために必要な範囲で、利用者のコンテンツを使用、複製、修正、公開、配布する非独占的かつ無償のライセンスを付与するものとします。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            6.3 フィードバック
          </Typography>
          <Typography paragraph>
            利用者が本サービスに関するフィードバック、提案、アイデアを当社に提供した場合、当社はこれらを自由に使用できるものとし、利用者はこれに対する報酬を請求できないものとします。
          </Typography>
        </>
      ),
    },
    {
      id: 'disclaimer',
      title: '7. 免責事項と責任制限',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            7.1 サービスの提供
          </Typography>
          <Typography paragraph>
            当社は、本サービスを「現状有姿」で提供します。本サービスの正確性、完全性、有用性、安全性、最新性、適法性について、明示または黙示を問わず、いかなる保証も行いません。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            7.2 免責
          </Typography>
          <Typography paragraph>
            当社は、以下の事項について責任を負いません：
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="本サービスの利用により生成されたコンテンツの内容、正確性、適法性" />
            </ListItem>
            <ListItem>
              <ListItemText primary="本サービスの中断、停止、終了、または利用不能" />
            </ListItem>
            <ListItem>
              <ListItemText primary="本サービスの利用に起因する利用者間または利用者と第三者との間のトラブル" />
            </ListItem>
            <ListItem>
              <ListItemText primary="本サービスに関連して利用者が被った損害（データの消失、業務の中断、利益の損失等を含む）" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Google Business Profile APIの変更、停止、終了による影響" />
            </ListItem>
            <ListItem>
              <ListItemText primary="第三者が提供するサービスやコンテンツの品質、安全性" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            7.3 責任の制限
          </Typography>
          <Typography paragraph>
            当社が利用者に対して損害賠償責任を負う場合、その責任は、利用者が当社に支払った直近12ヶ月間のサブスクリプション料金の総額を上限とします。
            ただし、当社の故意または重過失による場合は、この限りではありません。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            7.4 間接損害の免責
          </Typography>
          <Typography paragraph>
            当社は、いかなる場合においても、間接損害、特別損害、付随的損害、派生的損害、懲罰的損害、逸失利益について責任を負いません。
          </Typography>
        </>
      ),
    },
    {
      id: 'changes',
      title: '8. サービスの変更・終了',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            8.1 サービスの変更
          </Typography>
          <Typography paragraph>
            当社は、利用者への事前通知なく、本サービスの内容、機能、仕様を変更、追加、削除することができます。
            重要な変更の場合は、可能な限り事前に通知するよう努めます。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            8.2 サービスの一時停止
          </Typography>
          <Typography paragraph>
            当社は、以下の場合、本サービスの全部または一部を一時的に停止することができます：
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="システムの保守、点検、修理を行う場合" />
            </ListItem>
            <ListItem>
              <ListItemText primary="天災、事変、その他の非常事態が発生または発生するおそれがある場合" />
            </ListItem>
            <ListItem>
              <ListItemText primary="システムの不具合、過負荷、第三者による攻撃等により正常な運営が困難な場合" />
            </ListItem>
            <ListItem>
              <ListItemText primary="その他、当社が一時停止を必要と判断した場合" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            8.3 サービスの終了
          </Typography>
          <Typography paragraph>
            当社は、30日前までに利用者に通知することにより、本サービスの全部または一部を終了することができます。
            サービス終了時、未使用期間のサブスクリプション料金については、当社の判断により返金する場合があります。
          </Typography>
        </>
      ),
    },
    {
      id: 'cancellation',
      title: '9. 解約とデータ削除',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            9.1 利用者による解約
          </Typography>
          <Typography paragraph>
            利用者は、本サービスの設定画面からいつでもサブスクリプションを解約できます。
            解約は、次回の更新日をもって有効となります。解約後も、現在の請求期間の終了日までは本サービスをご利用いただけます。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            9.2 当社による解約
          </Typography>
          <Typography paragraph>
            当社は、利用者が本規約に違反した場合、またはその他当社が必要と判断した場合、事前通知なく利用者のアカウントを停止または削除することができます。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            9.3 データの削除
          </Typography>
          <Typography paragraph>
            アカウント解約後、利用者のデータは30日間保持され、その後完全に削除されます。
            削除されたデータの復元はできませんので、必要なデータは解約前にバックアップしてください。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            9.4 解約後の義務
          </Typography>
          <Typography paragraph>
            解約後も、本規約の「知的財産権」「免責事項と責任制限」「準拠法と管轄裁判所」に関する条項は、引き続き有効に存続します。
          </Typography>
        </>
      ),
    },
    {
      id: 'law',
      title: '10. 準拠法と管轄裁判所',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            10.1 準拠法
          </Typography>
          <Typography paragraph>
            本規約は、日本法に準拠し、日本法に従って解釈されるものとします。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            10.2 管轄裁判所
          </Typography>
          <Typography paragraph>
            本サービスに関連して利用者と当社との間で紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            10.3 紛争解決
          </Typography>
          <Typography paragraph>
            利用者と当社は、本サービスに関する紛争について、訴訟提起前に誠実に協議し、解決に努めるものとします。
          </Typography>
        </>
      ),
    },
    {
      id: 'antisocial',
      title: '11. 反社会的勢力の排除',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            11.1 表明保証
          </Typography>
          <Typography paragraph>
            利用者は、以下の事項を表明し、保証します：
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="自らが、暴力団、暴力団員、暴力団準構成員、暴力団関係企業、総会屋、社会運動標ぼうゴロ、政治活動標ぼうゴロ、特殊知能暴力集団その他の反社会的勢力（以下「反社会的勢力」といいます）ではないこと" />
            </ListItem>
            <ListItem>
              <ListItemText primary="反社会的勢力が経営に実質的に関与していないこと" />
            </ListItem>
            <ListItem>
              <ListItemText primary="反社会的勢力を利用しないこと" />
            </ListItem>
            <ListItem>
              <ListItemText primary="反社会的勢力に対して資金等を提供し、または便宜を供与するなどの関与をしていないこと" />
            </ListItem>
            <ListItem>
              <ListItemText primary="その他反社会的勢力と社会的に非難されるべき関係を有していないこと" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            11.2 契約解除
          </Typography>
          <Typography paragraph>
            利用者が前項の表明保証に違反した場合、当社は、何らの催告なく直ちに本サービスの利用契約を解除できるものとし、これにより利用者に生じた損害について一切の責任を負いません。
          </Typography>
        </>
      ),
    },
    {
      id: 'privacy',
      title: '12. 個人情報の取り扱い',
      content: (
        <>
          <Typography paragraph>
            当社は、本サービスの提供にあたり、利用者の個人情報を取得し、利用します。
            個人情報の取り扱いについては、当社の
            <MuiLink
              component={Link}
              href="/legal/privacy"
              sx={{ mx: 0.5, textDecoration: 'underline' }}
            >
              プライバシーポリシー
            </MuiLink>
            をご確認ください。
          </Typography>

          <Typography paragraph sx={{ mt: 2 }}>
            利用者は、本サービスの利用により、当社が以下の目的で個人情報を利用することに同意するものとします：
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="本サービスの提供、運営、改善" />
            </ListItem>
            <ListItem>
              <ListItemText primary="利用者からのお問い合わせへの対応" />
            </ListItem>
            <ListItem>
              <ListItemText primary="本サービスに関する重要なお知らせの通知" />
            </ListItem>
            <ListItem>
              <ListItemText primary="利用状況の分析および統計データの作成" />
            </ListItem>
            <ListItem>
              <ListItemText primary="その他、本サービスの提供に必要な業務" />
            </ListItem>
          </List>
        </>
      ),
    },
    {
      id: 'amendment',
      title: '13. 規約の変更',
      content: (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            13.1 変更の権利
          </Typography>
          <Typography paragraph>
            当社は、以下の場合、利用者の同意を得ることなく本規約を変更することができます：
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="本規約の変更が、利用者の一般の利益に適合するとき" />
            </ListItem>
            <ListItem>
              <ListItemText primary="本規約の変更が、契約をした目的に反せず、かつ、変更の必要性、変更後の内容の相当性、変更の内容その他の変更に係る事情に照らして合理的なものであるとき" />
            </ListItem>
          </List>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            13.2 変更の通知
          </Typography>
          <Typography paragraph>
            本規約を変更する場合、当社は、変更後の本規約の効力発生日の30日前までに、変更内容を本サービス上または電子メールで通知します。
            ただし、軽微な変更の場合は、本サービス上での掲載のみとする場合があります。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            13.3 変更の承諾
          </Typography>
          <Typography paragraph>
            利用者は、変更後の本規約の効力発生日以降に本サービスを利用した場合、変更後の本規約に同意したものとみなされます。
            変更後の本規約に同意できない場合は、本サービスの利用を中止してください。
          </Typography>
        </>
      ),
    },
    {
      id: 'contact',
      title: '14. 連絡先',
      content: (
        <>
          <Typography paragraph>
            本規約またはサービスに関するお問い合わせは、以下の連絡先までお願いします：
          </Typography>

          <Paper variant="outlined" sx={{ p: 3, mt: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              RevAI Concierge サポート窓口
            </Typography>
            <Typography variant="body2" gutterBottom>
              メールアドレス: support@revai-concierge.jp
            </Typography>
            <Typography variant="body2" gutterBottom>
              受付時間: 平日 10:00-18:00（土日祝日を除く）
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              ※お問い合わせ内容により、回答までにお時間をいただく場合がございます。
            </Typography>
          </Paper>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              本規約は、日本語を正文とします。本規約の他言語への翻訳版が提供される場合でも、日本語版が優先されます。
            </Typography>
          </Alert>
        </>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>利用規約 | RevAI Concierge - Google Review AI Reply Management</title>
        <meta
          name="description"
          content="RevAI Concierge（Google Review AI Reply Management）の利用規約。サービスの利用条件、アカウント管理、サブスクリプション、禁止事項、免責事項などを定めています。"
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="利用規約 | RevAI Concierge" />
        <meta
          property="og:description"
          content="RevAI Conciergeの利用規約。サービスの利用条件、アカウント管理、サブスクリプション、禁止事項、免責事項などを定めています。"
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://revai-concierge.jp/legal/terms" />
      </Head>

      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
        <Container maxWidth="md">
          {/* Breadcrumbs */}
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
            <MuiLink
              component={Link}
              href="/dashboard"
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'text.primary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
              ホーム
            </MuiLink>
            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <GavelIcon sx={{ mr: 0.5 }} fontSize="small" />
              利用規約
            </Typography>
          </Breadcrumbs>

          {/* Back Button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
            sx={{ mb: 2 }}
          >
            戻る
          </Button>

          {/* Main Content */}
          <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, mb: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <GavelIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                利用規約
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Terms of Service
              </Typography>
              <Typography variant="body2" color="text.secondary">
                最終更新日: {lastUpdated}
              </Typography>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Introduction */}
            <Alert severity="warning" sx={{ mb: 4 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                ご利用前に必ずお読みください
              </Typography>
              <Typography variant="body2">
                本利用規約（以下「本規約」といいます）は、RevAI
                Conciergeが提供するサービスの利用条件を定めるものです。
                本サービスをご利用いただくには、本規約のすべての内容に同意いただく必要があります。
                本サービスを利用することで、本規約に同意したものとみなされます。
              </Typography>
            </Alert>

            {/* Table of Contents */}
            <Paper variant="outlined" sx={{ p: 3, mb: 4, bgcolor: 'primary.50' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                目次
              </Typography>
              <List dense>
                {sections.map((section, index) => (
                  <ListItem key={section.id} sx={{ py: 0.5 }}>
                    <MuiLink
                      href={`#${section.id}`}
                      sx={{ textDecoration: 'none', color: 'primary.main' }}
                    >
                      {section.title}
                    </MuiLink>
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Sections */}
            {sections.map((section, index) => (
              <Box key={section.id} id={section.id} sx={{ mb: 5 }}>
                <Typography
                  variant="h5"
                  component="h2"
                  gutterBottom
                  fontWeight="bold"
                  color="primary.main"
                  sx={{
                    scrollMarginTop: '100px',
                    borderBottom: 2,
                    borderColor: 'primary.main',
                    pb: 1,
                  }}
                >
                  {section.title}
                </Typography>
                {section.content}
                {index < sections.length - 1 && <Divider sx={{ mt: 4 }} />}
              </Box>
            ))}

            {/* Footer Note */}
            <Divider sx={{ my: 4 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                最終更新日: {lastUpdated}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                © 2025 RevAI Concierge. All Rights Reserved.
              </Typography>
            </Box>
          </Paper>

          {/* Related Links */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              関連リンク
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                component={Link}
                href="/legal/privacy"
                variant="outlined"
                startIcon={<PrivacyTipIcon />}
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                プライバシーポリシー
              </Button>
              <Button
                component={Link}
                href="/dashboard"
                variant="outlined"
                startIcon={<HomeIcon />}
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                ダッシュボードに戻る
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
