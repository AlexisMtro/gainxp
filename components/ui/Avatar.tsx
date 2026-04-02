import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  /** URI de l'image. Si absent, affiche les initiales */
  uri?: string | null;
  /** Nom affiché en initiales si pas d'image */
  name?: string;
  size?: AvatarSize;
  /** Badge d'indicateur en bas à droite (ex: niveau) */
  badge?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SIZES: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Génère une couleur déterministe à partir du nom
function nameToColor(name?: string): string {
  const colors = [
    COLORS.primary, COLORS.violet, COLORS.indigo,
    COLORS.accent, COLORS.secondary, COLORS.warning,
  ];
  if (!name) return colors[0];
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[code % colors.length];
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function Avatar({ uri, name, size = 'md', badge }: AvatarProps) {
  const dim = SIZES[size];
  const fontSize = Math.round(dim * 0.35);
  const initials = getInitials(name);
  const bgColor = nameToColor(name);

  return (
    <View style={{ width: dim, height: dim }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bgColor },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}

      {/* Badge optionnel en bas à droite */}
      {badge ? (
        <View style={[styles.badge, { bottom: -2, right: -2 }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: COLORS.backgroundElevated,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.xp,
  },
});
