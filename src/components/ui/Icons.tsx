import { HugeiconsIcon } from '@hugeicons/react';
import {
    ChartUpIcon, FireIcon, BotIcon, Search01Icon, DashboardSquare01Icon,
    Award01Icon, Briefcase01Icon, Shield02Icon, Menu01Icon, Cancel01Icon,
    Loading03Icon, Add01Icon, ArrowUpRight01Icon, ArrowDownRight01Icon,
    Time02Icon, Wallet01Icon, ArrowRight01Icon, File01Icon, Activity01Icon,
    ZapIcon, Clock01Icon, ArrowLeft01Icon, LockIcon, BookOpen01Icon, CodeIcon,
    ComputerTerminal01Icon, Copy01Icon, Tick01Icon, LinkSquare01Icon, Globe02Icon,
    ArrowDown01Icon, ArrowUp01Icon, Shield01Icon
} from '@hugeicons-pro/core-bulk-rounded';

const withHugeicon = (iconObj: any) => {
    return function IconWrapper({ className, ...props }: any) {
        // Handle Lucide's size prop vs styles
        return <HugeiconsIcon icon={iconObj} className={className} {...props} />;
    };
};

export const TrendingUp = withHugeicon(ChartUpIcon);
export const Flame = withHugeicon(FireIcon);
export const Bot = withHugeicon(BotIcon);
export const Search = withHugeicon(Search01Icon);
export const LayoutGrid = withHugeicon(DashboardSquare01Icon);
export const Trophy = withHugeicon(Award01Icon);
export const Briefcase = withHugeicon(Briefcase01Icon);
export const ShieldAlert = withHugeicon(Shield02Icon);
export const Menu = withHugeicon(Menu01Icon);
export const X = withHugeicon(Cancel01Icon);
export const Loader2 = (props: any) => {
    const Icon = withHugeicon(Loading03Icon);
    return <Icon {...props} className={props.className ? `${props.className} animate-spin` : 'animate-spin'} />;
};
export const Plus = withHugeicon(Add01Icon);
export const ArrowUpRight = withHugeicon(ArrowUpRight01Icon);
export const ArrowDownRight = withHugeicon(ArrowDownRight01Icon);
export const History = withHugeicon(Time02Icon);
export const Wallet = withHugeicon(Wallet01Icon);
export const ArrowRight = withHugeicon(ArrowRight01Icon);
export const FileText = withHugeicon(File01Icon);
export const Activity = withHugeicon(Activity01Icon);
export const Zap = withHugeicon(ZapIcon);
export const Clock = withHugeicon(Clock01Icon);
export const ArrowLeft = withHugeicon(ArrowLeft01Icon);
export const Lock = withHugeicon(LockIcon);
export const BookOpen = withHugeicon(BookOpen01Icon);
export const Code2 = withHugeicon(CodeIcon);
export const Terminal = withHugeicon(ComputerTerminal01Icon);
export const Copy = withHugeicon(Copy01Icon);
export const Check = withHugeicon(Tick01Icon);
export const ExternalLink = withHugeicon(LinkSquare01Icon);
export const Globe = withHugeicon(Globe02Icon);
export const ChevronDown = withHugeicon(ArrowDown01Icon);
export const ChevronUp = withHugeicon(ArrowUp01Icon);
export const Shield = withHugeicon(Shield01Icon);
