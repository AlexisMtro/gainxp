import { useRef, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import BottomSheetLib, {
  BottomSheetView,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { COLORS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BottomSheetProps {
  /** Contrôle l'ouverture */
  isOpen: boolean;
  onClose: () => void;
  /**
   * Points d'accrochage (défaut : ['50%']).
   * Exemple : ['25%', '75%'] pour deux niveaux.
   */
  snapPoints?: string[];
  /** Si true, le contenu est scrollable */
  scrollable?: boolean;
  children: ReactNode;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function BottomSheet({
  isOpen,
  onClose,
  snapPoints: snapPointsProp,
  scrollable = false,
  children,
}: BottomSheetProps) {
  const ref = useRef<BottomSheetLib>(null);
  const snapPoints = useMemo(
    () => snapPointsProp ?? ['50%'],
    [snapPointsProp]
  );

  useEffect(() => {
    if (isOpen) {
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [isOpen]);

  const Content = scrollable ? BottomSheetScrollView : BottomSheetView;

  return (
    <BottomSheetLib
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: COLORS.backgroundCard }}
      handleIndicatorStyle={{ backgroundColor: COLORS.textMuted, width: 36 }}
    >
      <Content>{children}</Content>
    </BottomSheetLib>
  );
}
