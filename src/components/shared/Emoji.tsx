// src/components/shared/Emoji.tsx
//
// 이모지 → lucide 아이콘 매핑.
// 데이터(achievements/synergy/heldItems/storyChapters 등)에 박힌 이모지 문자열을
// 직접 고치지 않고, 렌더 지점에서 <Emoji glyph={icon} /> 로 감싸 lucide로 치환한다.
// 매핑에 없는 글리프는 원본 이모지를 그대로 렌더(안전한 폴백)하므로 점진 확장이 가능하다.
//
// 각 글리프는 [아이콘, 기본색] 튜플로 정의한다. lucide는 단색 라인 아이콘이라
// currentColor를 따르면 어두운 배경에서 안 보이므로, 원래 이모지의 느낌에 맞는
// 기본색을 지정한다. 호출부에서 color prop을 주면 그 값이 우선한다.
import React from "react";
import {
  Trophy, Swords, Sword, Target, Play, Sparkles, Sparkle, Gem, Coins, Zap,
  Settings, Store, Waves, RefreshCw, RefreshCcw, Medal, Star, Crown, Flame,
  Dna, Skull, AlertTriangle, BarChart3, Users, User, Award, CheckCircle,
  Gamepad2, Backpack, ShoppingCart, XCircle, Map as MapIcon, Heart, HeartCrack,
  Link, Globe, Menu, Bug, Timer, Clock, Castle, Ban, Rocket, BookOpen, Shield,
  PartyPopper, Moon, Sun, Eye, Lock, Unlock, Music, Droplet,
  Bot, Dice5, Drama, Square, Circle, Mars, Venus, Plus, Minus, Leaf, Bird,
  DoorOpen, Plug, Gift, Pill, Home, PawPrint, MessageCircle, Compass, Blocks,
  Antenna, HelpCircle, MapPin, Dog, Bone, Ghost, Glasses, Search, Shell,
  Beef, Syringe, Baby, Mountain, HardHat, Sprout, TreePine, TrendingUp,
  Landmark, Puzzle, Flower, Flower2, Hand, Cherry, Volume2,
  Sandwich, Snowflake, Egg, Candy, Tornado, type LucideIcon,
} from "lucide-react";

// 팔레트 — 어두운 네이비 배경(#0d1520 계열)에서 잘 보이는 톤
const C = {
  gold:   "#f0b840",
  silver: "#c4ccd6",
  bronze: "#d08a4e",
  steel:  "#b0bec5",
  red:    "#ef5350",
  orange: "#ff8a5c",
  yellow: "#ffd54a",
  cyan:   "#4dd0e1",
  blue:   "#5aa9f0",
  indigo: "#9aa6ef",
  green:  "#66bb6a",
  teal:   "#4db6ac",
  pink:   "#f06292",
  purple: "#ba68c8",
  brown:  "#b08968",
  gray:   "#90a4ae",
  white:  "#e6edf3",
};

type Entry = [LucideIcon, string];

export const EMOJI_TO_LUCIDE: Record<string, Entry> = {
  "🏆": [Trophy, C.gold], "⚔": [Swords, C.steel], "⚔️": [Swords, C.steel],
  "🗡": [Sword, C.steel], "🗡️": [Sword, C.steel],
  "🎯": [Target, C.red], "▶": [Play, C.blue], "▶️": [Play, C.blue],
  "✨": [Sparkles, C.yellow], "💫": [Sparkle, C.yellow], "🌟": [Sparkles, C.yellow],
  "🌠": [Sparkle, C.yellow], "💎": [Gem, C.cyan], "💰": [Coins, C.gold],
  "🪙": [Coins, C.gold], "🤑": [Coins, C.gold], "🏦": [Landmark, C.steel],
  "📈": [TrendingUp, C.green], "💯": [Award, C.gold], "⚡": [Zap, C.yellow],
  "⚙": [Settings, C.gray], "⚙️": [Settings, C.gray],
  "🏪": [Store, C.orange], "🛒": [ShoppingCart, C.orange], "🌊": [Waves, C.blue],
  "🔄": [RefreshCw, C.blue], "🔃": [RefreshCcw, C.blue],
  "🥈": [Medal, C.silver], "🥉": [Medal, C.bronze], "🥇": [Medal, C.gold],
  "🏅": [Medal, C.gold], "⭐": [Star, C.gold], "★": [Star, C.gold],
  "🌑": [Moon, C.indigo], "👑": [Crown, C.gold], "🔥": [Flame, C.orange],
  "🧬": [Dna, C.teal], "💀": [Skull, C.steel], "☠": [Skull, C.steel], "☠️": [Skull, C.steel],
  "⚠": [AlertTriangle, C.yellow], "⚠️": [AlertTriangle, C.yellow], "📊": [BarChart3, C.blue],
  "👥": [Users, C.blue], "👤": [User, C.blue], "🦸": [User, C.indigo],
  "✅": [CheckCircle, C.green], "🎮": [Gamepad2, C.purple], "🕹": [Gamepad2, C.purple],
  "🕹️": [Gamepad2, C.purple], "🎀": [Award, C.pink], "🎒": [Backpack, C.brown],
  "❌": [XCircle, C.red], "🚫": [Ban, C.red], "🗺": [MapIcon, C.green], "🗺️": [MapIcon, C.green],
  "🌀": [Tornado, C.cyan], "🌪": [Tornado, C.cyan], "🌪️": [Tornado, C.cyan],
  "❤": [Heart, C.red], "❤️": [Heart, C.red], "💙": [Heart, C.blue], "💝": [Heart, C.pink],
  "💔": [HeartCrack, C.red], "🔗": [Link, C.blue], "🌍": [Globe, C.teal],
  "🌎": [Globe, C.teal], "🌐": [Globe, C.teal], "☰": [Menu, C.gray], "🐛": [Bug, C.green],
  "⏱": [Timer, C.gray], "⏱️": [Timer, C.gray], "⏰": [Clock, C.gray], "⏳": [Clock, C.gray],
  "💤": [Clock, C.indigo], "😴": [Moon, C.indigo],
  "🏰": [Castle, C.brown], "🏛": [Landmark, C.steel], "🚀": [Rocket, C.orange],
  "📖": [BookOpen, C.brown], "📚": [BookOpen, C.brown],
  "🛡": [Shield, C.blue], "🛡️": [Shield, C.blue], "🔰": [Shield, C.green],
  "🎉": [PartyPopper, C.gold], "💥": [Sparkles, C.orange],
  "❄": [Snowflake, C.cyan], "❄️": [Snowflake, C.cyan], "➕": [Plus, C.green], "➖": [Minus, C.gray],
  "☀": [Sun, C.yellow], "☀️": [Sun, C.yellow], "🌙": [Moon, C.indigo],
  "👁": [Eye, C.blue], "👁️": [Eye, C.blue], "🔒": [Lock, C.steel], "🔓": [Unlock, C.green],
  "◀": [Play, C.blue], "◀️": [Play, C.blue], "🎵": [Music, C.purple], "♪": [Music, C.purple], "♫": [Music, C.purple],
  "🩸": [Droplet, C.red], "💧": [Droplet, C.blue],
  "🔵": [Circle, C.blue], "🔴": [Circle, C.red], "⚪": [Circle, C.gray],
  "🟢": [Circle, C.green], "🟠": [Circle, C.orange], "🟣": [Circle, C.purple],
  "⬜": [Square, C.steel], "🤖": [Bot, C.gray], "🎲": [Dice5, C.purple], "🎭": [Drama, C.purple],
  "♂": [Mars, C.blue], "♂️": [Mars, C.blue], "♀": [Venus, C.pink], "♀️": [Venus, C.pink],
  "🌿": [Leaf, C.green], "🌱": [Sprout, C.green], "🌳": [TreePine, C.green], "🦅": [Bird, C.brown],
  "🔮": [Gem, C.purple], "🪨": [Mountain, C.brown], "🌺": [Flower2, C.pink], "🌸": [Flower, C.pink],
  "🌈": [Sparkles, C.pink], "🧹": [RefreshCw, C.teal], "📱": [Gamepad2, C.gray],
  "🚪": [DoorOpen, C.brown], "🔌": [Plug, C.gray], "🎁": [Gift, C.red],
  "🍬": [Candy, C.pink], "💊": [Pill, C.purple], "🏠": [Home, C.blue], "🐾": [PawPrint, C.brown],
  "💬": [MessageCircle, C.blue], "🧭": [Compass, C.teal], "🧱": [Blocks, C.brown],
  "📡": [Antenna, C.blue], "❓": [HelpCircle, C.gray], "📍": [MapPin, C.red],
  "🐉": [Dna, C.green], "🦋": [Sparkle, C.cyan], "🗼": [Castle, C.brown],
  "🤝": [Hand, C.orange], "🤲": [Hand, C.orange], "💪": [Hand, C.orange],
  "🧩": [Puzzle, C.purple], "🌋": [Mountain, C.orange], "🔱": [Sword, C.steel],
  "🍒": [Cherry, C.red], "🍑": [Cherry, C.pink], "👓": [Glasses, C.gray], "🔍": [Search, C.gray],
  "🐚": [Shell, C.pink], "🍖": [Beef, C.brown], "💉": [Syringe, C.blue], "🍼": [Baby, C.white],
  "🐕": [Dog, C.brown], "🦴": [Bone, C.white], "🐒": [PawPrint, C.brown], "🧢": [HardHat, C.red],
  "🗿": [Mountain, C.gray], "👻": [Ghost, C.white], "🥊": [Swords, C.red],
  "🥚": [Egg, C.white], "🥋": [Swords, C.steel], "🔊": [Volume2, C.gray], "🥪": [Sandwich, C.brown],
};

interface EmojiProps {
  glyph?: string;
  size?: number;
  className?: string;
  /** lucide 컴포넌트에 전달할 색. 지정하면 매핑 기본색보다 우선한다. */
  color?: string;
  strokeWidth?: number;
}

/**
 * 이모지 글리프를 lucide 아이콘으로 렌더. 매핑에 없으면 원본 글리프를 그대로 출력.
 * 색은 color prop > 매핑 기본색 순으로 결정. inline-flex 정렬을 위해 span으로 감싼다.
 */
export const Emoji: React.FC<EmojiProps> = ({ glyph, size = 16, className, color, strokeWidth }) => {
  if (!glyph) return null;
  const entry = EMOJI_TO_LUCIDE[glyph];
  if (entry) {
    const [Ico, defaultColor] = entry;
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
        <Ico size={size} color={color ?? defaultColor} strokeWidth={strokeWidth} />
      </span>
    );
  }
  return <span className={className}>{glyph}</span>;
};

export default Emoji;
