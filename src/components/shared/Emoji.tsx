// src/components/shared/Emoji.tsx
//
// 이모지 → lucide 아이콘 매핑.
// 데이터(achievements/synergy/heldItems/storyChapters 등)에 박힌 이모지 문자열을
// 직접 고치지 않고, 렌더 지점에서 <Emoji glyph={icon} /> 로 감싸 lucide로 치환한다.
// 매핑에 없는 글리프는 원본 이모지를 그대로 렌더(안전한 폴백)하므로 점진 확장이 가능하다.
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

export const EMOJI_TO_LUCIDE: Record<string, LucideIcon> = {
  "🏆": Trophy, "⚔": Swords, "⚔️": Swords, "🗡": Sword, "🗡️": Sword,
  "🎯": Target, "▶": Play, "▶️": Play, "✨": Sparkles, "💫": Sparkle, "🌟": Sparkles,
  "🌠": Sparkle, "💎": Gem, "💰": Coins, "🪙": Coins, "🤑": Coins, "🏦": Landmark,
  "📈": TrendingUp, "💯": Award, "⚡": Zap, "⚙": Settings, "⚙️": Settings,
  "🏪": Store, "🛒": ShoppingCart, "🌊": Waves, "🔄": RefreshCw, "🔃": RefreshCcw,
  "🥈": Medal, "🥉": Medal, "🥇": Medal, "🏅": Medal, "⭐": Star,
  "★": Star, "🌑": Moon, "👑": Crown, "🔥": Flame, "🧬": Dna, "💀": Skull,
  "☠": Skull, "☠️": Skull, "⚠": AlertTriangle, "⚠️": AlertTriangle, "📊": BarChart3,
  "👥": Users, "👤": User, "🦸": User, "✅": CheckCircle, "🎮": Gamepad2,
  "🕹": Gamepad2, "🕹️": Gamepad2, "🎀": Award, "🎒": Backpack, "❌": XCircle,
  "🚫": Ban, "🗺": MapIcon, "🗺️": MapIcon, "🌀": Tornado, "🌪": Tornado,
  "❤": Heart, "❤️": Heart, "💙": Heart, "💝": Heart, "💔": HeartCrack,
  "🔗": Link, "🌍": Globe, "🌎": Globe, "🌐": Globe, "☰": Menu, "🐛": Bug,
  "⏱": Timer, "⏱️": Timer, "⏰": Clock, "⏳": Clock, "💤": Clock, "😴": Moon,
  "🏰": Castle, "🏛": Landmark, "🚀": Rocket, "📖": BookOpen, "📚": BookOpen,
  "🛡": Shield, "🛡️": Shield, "🔰": Shield, "🎉": PartyPopper, "💥": Sparkles,
  "❄": Snowflake, "❄️": Snowflake, "➕": Plus, "➖": Minus, "☀": Sun, "☀️": Sun,
  "🌙": Moon, "👁": Eye, "👁️": Eye, "🔒": Lock, "🔓": Unlock, "◀": Play,
  "◀️": Play, "🎵": Music, "♪": Music, "♫": Music, "🩸": Droplet, "💧": Droplet,
  "🔵": Circle, "🔴": Circle, "⚪": Circle, "🟢": Circle, "🟠": Circle, "🟣": Circle,
  "⬜": Square, "🤖": Bot, "🎲": Dice5, "🎭": Drama, "♂": Mars, "♂️": Mars,
  "♀": Venus, "♀️": Venus, "🌿": Leaf, "🌱": Sprout, "🌳": TreePine, "🦅": Bird,
  "🔮": Gem, "🪨": Mountain, "🌺": Flower2, "🌸": Flower, "🌈": Sparkles,
  "🧹": RefreshCw, "📱": Gamepad2, "🚪": DoorOpen, "🔌": Plug, "🎁": Gift,
  "🍬": Candy, "💊": Pill, "🏠": Home, "🐾": PawPrint, "💬": MessageCircle,
  "🧭": Compass, "🧱": Blocks, "📡": Antenna, "❓": HelpCircle, "📍": MapPin,
  "🐉": Dna, "🦋": Sparkle, "🗼": Castle, "🤝": Hand, "🤲": Hand, "💪": Hand,
  "🧩": Puzzle, "🌋": Mountain, "🔱": Sword, "🍒": Cherry, "🍑": Cherry,
  "👓": Glasses, "🔍": Search, "🐚": Shell, "🍖": Beef, "💉": Syringe,
  "🍼": Baby, "🐕": Dog, "🦴": Bone, "🐒": PawPrint, "🧢": HardHat, "🗿": Mountain,
  "👻": Ghost, "🥊": Swords, "🌪️": Tornado,
  "🥚": Egg, "🥋": Swords, "🔊": Volume2, "🥪": Sandwich,
};

interface EmojiProps {
  glyph?: string;
  size?: number;
  className?: string;
  /** lucide 컴포넌트에 전달할 색(기본: currentColor) */
  color?: string;
  strokeWidth?: number;
}

/**
 * 이모지 글리프를 lucide 아이콘으로 렌더. 매핑에 없으면 원본 글리프를 그대로 출력.
 * inline-flex 정렬을 위해 span으로 감싼다.
 */
export const Emoji: React.FC<EmojiProps> = ({ glyph, size = 16, className, color, strokeWidth }) => {
  if (!glyph) return null;
  const Ico = EMOJI_TO_LUCIDE[glyph];
  if (Ico) {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}>
        <Ico size={size} color={color} strokeWidth={strokeWidth} />
      </span>
    );
  }
  return <span className={className}>{glyph}</span>;
};

export default Emoji;
