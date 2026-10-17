import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { PantryGroup, PantryReviewItem } from '../types';

interface PantryReviewScreenProps {
  initialItems: PantryReviewItem[];
  onGenerateRecipes: (confirmedItems: PantryReviewItem[]) => void;
  onBackToScan?: () => void;
  isGenerating?: boolean;
  onItemsChange?: (items: PantryReviewItem[]) => void;
  lastSyncTime?: string | null;
}

const CATEGORY_CONFIG: Record<
  PantryGroup,
  { label: string; icon: string; bg: string; text: string; border: string; lightBg: string }
> = {
  Dairy: {
    label: 'Dairy & Eggs',
    icon: '🥛',
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
    lightBg: '#f8fafc'
  },
  Produce: {
    label: 'Fresh Produce',
    icon: '🥬',
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
    lightBg: '#f8fafc'
  },
  Pantry: {
    label: 'Pantry Staples',
    icon: '🌾',
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
    lightBg: '#f8fafc'
  }
};

export function PantryReviewScreen({
  initialItems,
  onGenerateRecipes,
  onBackToScan,
  isGenerating = false,
  onItemsChange,
  lastSyncTime
}: PantryReviewScreenProps) {
  const [items, setItems] = useState<PantryReviewItem[]>(initialItems);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryReviewItem | null>(null);

  // Synchronize when initialItems prop updates from local cache or new scan
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formGroup, setFormGroup] = useState<PantryGroup>('Produce');
  const [formIsExpiring, setFormIsExpiring] = useState(false);

  // Group items by category
  const groups: PantryGroup[] = ['Produce', 'Dairy', 'Pantry'];

  const getItemsByGroup = (group: PantryGroup) =>
    items.filter((item) => item.group === group);

  // Open modal for Adding new item
  const handleOpenAddModal = (defaultGroup: PantryGroup = 'Produce') => {
    setEditingItem(null);
    setFormName('');
    setFormQuantity('1 portion');
    setFormGroup(defaultGroup);
    setFormIsExpiring(false);
    setModalVisible(true);
  };

  // Open modal for Editing existing item
  const handleOpenEditModal = (item: PantryReviewItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormQuantity(item.quantity);
    setFormGroup(item.group);
    setFormIsExpiring(item.status === 'expiring_soon');
    setModalVisible(true);
  };

  // Save Add / Edit
  const handleSaveItem = () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter an ingredient name.');
      return;
    }

    let updated: PantryReviewItem[];

    if (editingItem) {
      // Update existing item
      updated = items.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              name: trimmedName,
              quantity: formQuantity.trim() || '1 portion',
              group: formGroup,
              status: formIsExpiring ? ('expiring_soon' as const) : ('fresh' as const)
            }
          : item
      );
    } else {
      // Add new item
      const newItem: PantryReviewItem = {
        id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: trimmedName,
        quantity: formQuantity.trim() || '1 portion',
        group: formGroup,
        status: formIsExpiring ? 'expiring_soon' : 'fresh',
        isCustom: true
      };
      updated = [...items, newItem];
    }

    setItems(updated);
    onItemsChange?.(updated);
    setModalVisible(false);
    setEditingItem(null);
  };

  // Delete item
  const handleDeleteItem = (itemId: string, itemName: string) => {
    Alert.alert(
      'Remove Ingredient',
      `Are you sure you want to remove "${itemName}" from your pantry list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = items.filter((item) => item.id !== itemId);
            setItems(updated);
            onItemsChange?.(updated);
          }
        }
      ]
    );
  };

  // Trigger recipe generation
  const handleConfirmAndGenerate = () => {
    if (items.length === 0) {
      Alert.alert(
        'Pantry is Empty',
        'Please add or confirm at least one ingredient to generate recipes.'
      );
      return;
    }
    onGenerateRecipes(items);
  };

  const expiringCount = items.filter((i) => i.status === 'expiring_soon').length;

  return (
    <View style={styles.screenContainer}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        {onBackToScan && (
          <TouchableOpacity onPress={onBackToScan} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Scan More</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.screenHeading}>Pantry Review</Text>
          <Text style={styles.screenSubheading}>
            Verify recognized items before generating recipes
          </Text>
        </View>
      </View>

      {/* Summary KPI Strip */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiNumber}>{items.length}</Text>
          <Text style={styles.kpiLabel}>Total Items</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiNumber, expiringCount > 0 && styles.kpiExpiring]}>
            {expiringCount}
          </Text>
          <Text style={styles.kpiLabel}>Expiring Soon</Text>
        </View>
        <View style={styles.kpiDivider} />
        <TouchableOpacity
          style={styles.quickAddHeaderBtn}
          onPress={() => handleOpenAddModal('Produce')}
        >
          <Text style={styles.quickAddHeaderBtnText}>+ Add Missing</Text>
        </TouchableOpacity>
      </View>

      {/* Offline Storage Status Indicator */}
      <View style={styles.offlineStorageBar}>
        <Text style={styles.offlineStorageIcon}>💾</Text>
        <Text style={styles.offlineStorageText}>
          Saved locally on device (Offline Ready)
          {lastSyncTime
            ? ` • Synced ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : ''}
        </Text>
      </View>

      {/* Main Categorized Items Scroll Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => {
          const groupItems = getItemsByGroup(group);
          const config = CATEGORY_CONFIG[group];

          return (
            <View key={group} style={styles.groupSection}>
              {/* Category Header */}
              <View style={styles.groupHeaderRow}>
                <View style={styles.groupTitleWrap}>
                  <Text style={styles.groupIcon}>{config.icon}</Text>
                  <Text style={styles.groupTitle}>{config.label}</Text>
                  <View style={[styles.badgeCount, { backgroundColor: config.bg }]}>
                    <Text style={[styles.badgeCountText, { color: config.text }]}>
                      {groupItems.length}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.groupAddBtn, { borderColor: config.border }]}
                  onPress={() => handleOpenAddModal(group)}
                >
                  <Text style={[styles.groupAddBtnText, { color: config.text }]}>
                    + Add
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tag Cloud for Category */}
              {groupItems.length === 0 ? (
                <View style={styles.emptyGroupCard}>
                  <Text style={styles.emptyGroupText}>
                    No {group.toLowerCase()} items detected.
                  </Text>
                  <TouchableOpacity onPress={() => handleOpenAddModal(group)}>
                    <Text style={[styles.emptyGroupAddLink, { color: config.text }]}>
                      Tap here to add {group.toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.tagsContainer}>
                  {groupItems.map((item) => {
                    const isExpiring = item.status === 'expiring_soon';

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.tagWrapper,
                          { backgroundColor: config.bg, borderColor: config.border },
                          isExpiring && styles.tagExpiringBorder
                        ]}
                      >
                        {/* Tap tag body to edit */}
                        <TouchableOpacity
                          style={styles.tagContentArea}
                          onPress={() => handleOpenEditModal(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.tagTextColumn}>
                            <View style={styles.tagNameRow}>
                              <Text
                                style={[styles.tagNameText, { color: config.text }]}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              {isExpiring && (
                                <Text style={styles.expiringBadge}>⚡ Expiring</Text>
                              )}
                            </View>
                            <Text style={styles.tagQuantityText}>
                              {item.quantity}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Quick Delete Cross Button */}
                        <TouchableOpacity
                          style={styles.deleteTagBtn}
                          onPress={() => handleDeleteItem(item.id, item.name)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.deleteTagIcon}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Informational Guidance */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Tip: Tap any ingredient tag to edit its name, quantity, or mark it as expiring soon. Gemini will prioritize recipes that use your expiring ingredients first!
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            (items.length === 0 || isGenerating) && styles.buttonDisabled
          ]}
          onPress={handleConfirmAndGenerate}
          disabled={items.length === 0 || isGenerating}
        >
          <Text style={styles.generateButtonText}>
            {isGenerating
              ? 'Chef Gemini is Thinking...'
              : `Generate Recipes (${items.length} ${items.length === 1 ? 'item' : 'items'}) ➔`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add / Edit Item Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Ingredient' : 'Add Missed Ingredient'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Input: Item Name */}
            <Text style={styles.inputLabel}>Ingredient Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Greek Yogurt, Tomatoes, Olive Oil"
              placeholderTextColor="#94a3b8"
              value={formName}
              onChangeText={setFormName}
              autoFocus
            />

            {/* Input: Quantity */}
            <Text style={styles.inputLabel}>Quantity / Amount</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 500g, 2 pieces, 1 cup"
              placeholderTextColor="#94a3b8"
              value={formQuantity}
              onChangeText={setFormQuantity}
            />

            {/* Category Group Selector */}
            <Text style={styles.inputLabel}>Category Group</Text>
            <View style={styles.categoryRadioRow}>
              {groups.map((group) => {
                const isSelected = formGroup === group;
                const cfg = CATEGORY_CONFIG[group];
                return (
                  <TouchableOpacity
                    key={group}
                    style={[
                      styles.categoryRadioBtn,
                      isSelected && {
                        backgroundColor: cfg.bg,
                        borderColor: cfg.border
                      }
                    ]}
                    onPress={() => setFormGroup(group)}
                  >
                    <Text style={styles.radioIcon}>{cfg.icon}</Text>
                    <Text
                      style={[
                        styles.radioLabel,
                        isSelected && { color: cfg.text, fontWeight: '700' }
                      ]}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expiring Soon Toggle */}
            <TouchableOpacity
              style={[
                styles.expiringToggleRow,
                formIsExpiring && styles.expiringToggleRowActive
              ]}
              onPress={() => setFormIsExpiring(!formIsExpiring)}
            >
              <View style={styles.checkboxWrap}>
                <Text style={styles.checkboxText}>
                  {formIsExpiring ? '☑' : '☐'}
                </Text>
              </View>
              <View style={styles.checkboxLabelWrap}>
                <Text style={styles.expiringToggleTitle}>
                  ⚡ Mark as Expiring Soon
                </Text>
                <Text style={styles.expiringToggleSubtitle}>
                  Prioritizes this item in recipe generation to prevent waste.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Modal Actions */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveItem}
              >
                <Text style={styles.modalSaveText}>
                  {editingItem ? 'Save Changes' : 'Add to Pantry'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backButton: {
    marginBottom: 6
  },
  backButtonText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600'
  },
  titleContainer: {
    marginTop: 2
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5
  },
  screenSubheading: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  },
  kpiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  kpiBox: {
    alignItems: 'center',
    paddingHorizontal: 12
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a'
  },
  kpiExpiring: {
    color: '#dc2626'
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e2e8f0'
  },
  quickAddHeaderBtn: {
    marginLeft: 'auto',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  quickAddHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669'
  },
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100
  },
  groupSection: {
    marginBottom: 24
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  groupTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  groupIcon: {
    fontSize: 18
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b'
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '700'
  },
  groupAddBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#ffffff'
  },
  groupAddBtnText: {
    fontSize: 12,
    fontWeight: '700'
  },
  emptyGroupCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center'
  },
  emptyGroupText: {
    fontSize: 13,
    color: '#94a3b8'
  },
  emptyGroupAddLink: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  tagWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  tagExpiringBorder: {
    borderColor: '#f87171',
    borderWidth: 1.5
  },
  tagContentArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1
  },
  tagTextColumn: {
    marginRight: 6
  },
  tagNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  tagNameText: {
    fontSize: 14,
    fontWeight: '700'
  },
  expiringBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6
  },
  tagQuantityText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1
  },
  deleteTagBtn: {
    padding: 4,
    marginLeft: 2
  },
  deleteTagIcon: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700'
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    gap: 10,
    alignItems: 'flex-start'
  },
  tipIcon: {
    fontSize: 18
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10
  },
  generateButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b'
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a'
  },
  categoryRadioRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  categoryRadioBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    gap: 6
  },
  radioIcon: {
    fontSize: 14
  },
  radioLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  expiringToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    gap: 12
  },
  expiringToggleRowActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca'
  },
  checkboxWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxText: {
    fontSize: 22,
    color: '#dc2626'
  },
  checkboxLabelWrap: {
    flex: 1
  },
  expiringToggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b'
  },
  expiringToggleSubtitle: {
    fontSize: 11,
    color: '#b91c1c',
    marginTop: 2
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9'
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#10b981'
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  offlineStorageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 6
  },
  offlineStorageIcon: {
    fontSize: 12
  },
  offlineStorageText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  }
});
