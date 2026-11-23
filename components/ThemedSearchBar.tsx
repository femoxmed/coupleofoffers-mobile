import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  RotateCcw,
} from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { NIGERIAN_STATES, getCitiesForState } from '../constants/nigerian-locations';
import { useCategories, FALLBACK_CATEGORIES } from '../hooks/useCategories';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FilterState {
  category: string;
  categories?: string[];
  area: string;
  state?: string;
  city?: string;
  partySize: string; // 'all' | '1' | '2' | 'group'
  priceRange: string; // 'all' | 'under-50k' | '50k-100k' | '100k-200k' | 'above-200k'
}

export const DEFAULT_FILTERS: FilterState = {
  category: 'all',
  categories: ['all'],
  area: 'all',
  state: 'all',
  city: 'all',
  partySize: 'all',
  priceRange: 'all',
};

export const CATEGORY_OPTIONS = FALLBACK_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
}));

export const PARTY_SIZE_OPTIONS = [
  { id: 'all', label: 'Any group' },
  { id: '1', label: 'Solo / 1 person' },
  { id: '2', label: 'Table for 2' },
  { id: 'group', label: 'Group (3+)' },
];

export const PRICE_RANGE_OPTIONS = [
  { id: 'all', label: 'Any Price' },
  { id: 'under-50k', label: 'Under ₦50k' },
  { id: '50k-100k', label: '₦50k – ₦100k' },
  { id: '100k-200k', label: '₦100k – ₦200k' },
  { id: 'above-200k', label: '₦200k+' },
];

export const DEFAULT_AREAS = [
  'All Locations',
];

type ModalFilterType = 'category' | 'area' | 'budget' | 'party' | null;

interface ThemedSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  filters?: FilterState;
  onApplyFilters?: (filters: FilterState) => void;
  availableAreas?: string[];
  initialPillsExpanded?: boolean;
  showFilterChips?: boolean;
}

export function ThemedSearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search experiences, venues, or areas...',
  filters = DEFAULT_FILTERS,
  onApplyFilters,
  availableAreas = DEFAULT_AREAS,
  initialPillsExpanded = false,
  showFilterChips = true,
}: ThemedSearchBarProps) {
  const { categories: dynamicCategories } = useCategories();

  const categoryOptions = useMemo(() => {
    return dynamicCategories.map((c) => ({
      id: c.id,
      label: c.label || c.name,
    }));
  }, [dynamicCategories]);

  const currentCategories = useMemo<string[]>(() => {
    if (Array.isArray(filters.categories) && filters.categories.length > 0) {
      return filters.categories;
    }
    if (filters.category && filters.category !== 'all') {
      return filters.category.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
    }
    return ['all'];
  }, [filters.categories, filters.category]);

  const isCategoryActive = currentCategories.length > 0 && !currentCategories.includes('all');

  // Count active filters (excluding 'all')
  const activeCount = Object.entries(filters).filter(
    ([key, val]) => {
      if (key === 'category' || key === 'categories') return false;
      if (key === 'area' && ((filters.city && filters.city !== 'all') || (filters.state && filters.state !== 'all'))) return false;
      return val && val !== 'all' && val !== 'All Areas' && val !== 'All Locations';
    }
  ).length + (isCategoryActive ? 1 : 0);

  // The pills only show when user clicks the filter icon (or if active filters already exist)
  const [pillsExpanded, setPillsExpanded] = useState<boolean>(
    initialPillsExpanded || activeCount > 0
  );

  // Tracks which specific filter modal is open: 'category' | 'area' | 'budget' | 'party'
  const [activeModalType, setActiveModalType] = useState<ModalFilterType>(null);

  // Temporary selection while modal is open
  const [tempCategories, setTempCategories] = useState<string[]>(['all']);
  const [tempValue, setTempValue] = useState<string>('');
  const [tempStateValue, setTempStateValue] = useState<string>('all');
  const [tempCityValue, setTempCityValue] = useState<string>('all');

  const togglePills = () => {
    setPillsExpanded((prev) => !prev);
  };

  const openFilterModal = (type: ModalFilterType) => {
    if (!type) return;
    if (type === 'category') setTempCategories(currentCategories);
    else if (type === 'area') {
      setTempStateValue(filters.state || 'all');
      setTempCityValue(filters.city || (filters.area !== 'all' && filters.area !== 'All Areas' ? filters.area : 'all'));
    }
    else if (type === 'budget') setTempValue(filters.priceRange);
    else if (type === 'party') setTempValue(filters.partySize);
    setActiveModalType(type);
  };

  const handleApplySingle = () => {
    if (!activeModalType) return;
    const updated: FilterState = { ...filters };
    if (activeModalType === 'category') {
      const isAll = tempCategories.length === 0 || tempCategories.includes('all');
      updated.categories = isAll ? ['all'] : tempCategories;
      updated.category = isAll ? 'all' : tempCategories.join(',');
    }
    else if (activeModalType === 'area') {
      updated.state = tempStateValue;
      updated.city = tempCityValue;
      updated.area = tempCityValue !== 'all' ? tempCityValue : (tempStateValue !== 'all' ? tempStateValue : 'all');
    }
    else if (activeModalType === 'budget') updated.priceRange = tempValue;
    else if (activeModalType === 'party') updated.partySize = tempValue;

    onApplyFilters?.(updated);
    setActiveModalType(null);
  };

  const handleResetSingle = () => {
    if (!activeModalType) return;
    const updated: FilterState = { ...filters };
    if (activeModalType === 'category') {
      updated.categories = ['all'];
      updated.category = 'all';
      setTempCategories(['all']);
    }
    else if (activeModalType === 'area') {
      updated.state = 'all';
      updated.city = 'all';
      updated.area = 'all';
      setTempStateValue('all');
      setTempCityValue('all');
    }
    else if (activeModalType === 'budget') updated.priceRange = 'all';
    else if (activeModalType === 'party') updated.partySize = 'all';

    setTempValue('all');
    onApplyFilters?.(updated);
    setActiveModalType(null);
  };

  const handleResetAll = () => {
    const reset: FilterState = { ...DEFAULT_FILTERS, categories: ['all'], category: 'all', state: 'all', city: 'all', area: 'all' };
    setTempCategories(['all']);
    setTempStateValue('all');
    setTempCityValue('all');
    onApplyFilters?.(reset);
  };

  // Human-readable labels for chips
  const categoryLabel = useMemo(() => {
    if (!isCategoryActive) return 'Category';
    if (currentCategories.length === 1) {
      const found = categoryOptions.find((c) => c.id.toLowerCase() === currentCategories[0].toLowerCase());
      return found?.label || currentCategories[0];
    }
    return `Categories (${currentCategories.length})`;
  }, [isCategoryActive, currentCategories, categoryOptions]);
  const areaLabel =
    filters.city && filters.city !== 'all' && filters.city !== 'All Areas' && filters.city !== 'All Locations'
      ? filters.city
      : filters.state && filters.state !== 'all'
      ? filters.state
      : filters.area !== 'all' && filters.area !== 'All Areas' && filters.area !== 'All Locations'
      ? filters.area
      : 'Location';
  const partyLabel =
    PARTY_SIZE_OPTIONS.find((p) => p.id === filters.partySize)?.label || 'Party Size';
  const budgetLabel =
    PRICE_RANGE_OPTIONS.find((pr) => pr.id === filters.priceRange)?.label || 'Budget';

  return (
    <View style={styles.wrapper}>
      {/* 1. Main Search Input Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchIconCircle}>
          <Search size={16} color={Palette.mulberry} />
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={Palette.mutedText}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          clearButtonMode="never"
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
        />

        {value.trim().length > 0 ? (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.clearBtn}
            activeOpacity={0.7}
          >
            <X size={18} color={Palette.porcelain} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : null}

        {/* Themed Filter Icon Button - Tapping toggles the filter pills below */}
        <TouchableOpacity
          onPress={togglePills}
          style={[
            styles.filterBtn,
            (pillsExpanded || activeCount > 0) && styles.filterBtnActive,
          ]}
          activeOpacity={0.85}
          accessibilityLabel="Toggle filter options"
        >
          <SlidersHorizontal
            size={14}
            color={pillsExpanded || activeCount > 0 ? '#FAF5ED' : Palette.porcelain}
          />
          {activeCount > 0 && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Filter Pills: Only shown when the user clicks the filter icon */}
      {showFilterChips && pillsExpanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          style={styles.filterRowScroll}
        >
          {/* Reset Pill: On the left (not fixed, scrolls with the pills) with mild red color */}
          <TouchableOpacity
            onPress={handleResetAll}
            style={[
              styles.resetChipLeft,
              activeCount === 0 && styles.resetChipDisabled,
            ]}
            disabled={activeCount === 0}
            activeOpacity={0.75}
            accessibilityLabel="Reset all filters"
          >
            <RotateCcw
              size={11}
              color={activeCount === 0 ? Palette.mutedText : '#DC2626'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.resetChipLeftText,
                activeCount === 0 && styles.resetChipDisabledText,
              ]}
            >
              Reset
            </Text>
          </TouchableOpacity>

          {/* Category Pill Button */}
          <TouchableOpacity
            onPress={() => openFilterModal('category')}
            style={[
              styles.chip,
              isCategoryActive && styles.chipActive,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                isCategoryActive && styles.chipTextActive,
              ]}
            >
              {categoryLabel}
            </Text>
            <ChevronDown
              size={12}
              color={isCategoryActive ? '#FAF5ED' : Palette.mutedText}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>

          {/* Area Pill Button */}
          <TouchableOpacity
            onPress={() => openFilterModal('area')}
            style={[
              styles.chip,
              filters.area !== 'all' && filters.area !== 'All Areas' && styles.chipActive,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                filters.area !== 'all' && filters.area !== 'All Areas' && styles.chipTextActive,
              ]}
            >
              {areaLabel}
            </Text>
            <ChevronDown
              size={12}
              color={
                filters.area !== 'all' && filters.area !== 'All Areas'
                  ? '#FAF5ED'
                  : Palette.mutedText
              }
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>

          {/* Budget / Price Pill Button */}
          <TouchableOpacity
            onPress={() => openFilterModal('budget')}
            style={[
              styles.chip,
              filters.priceRange !== 'all' && styles.chipActive,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                filters.priceRange !== 'all' && styles.chipTextActive,
              ]}
            >
              {budgetLabel}
            </Text>
            <ChevronDown
              size={12}
              color={filters.priceRange !== 'all' ? '#FAF5ED' : Palette.mutedText}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>

          {/* Party Size Pill Button */}
          <TouchableOpacity
            onPress={() => openFilterModal('party')}
            style={[
              styles.chip,
              filters.partySize !== 'all' && styles.chipActive,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                filters.partySize !== 'all' && styles.chipTextActive,
              ]}
            >
              {partyLabel}
            </Text>
            <ChevronDown
              size={12}
              color={filters.partySize !== 'all' ? '#FAF5ED' : Palette.mutedText}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 3. Specific Filter Modal from Under (Shows only the specific clicked filter) */}
      <Modal
        visible={activeModalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModalType(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActiveModalType(null)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {activeModalType === 'category' && 'Category'}
                {activeModalType === 'area' && 'Location'}
                {activeModalType === 'budget' && 'Budget / Price Range'}
                {activeModalType === 'party' && 'Party Size'}
              </Text>

              <TouchableOpacity
                onPress={() => setActiveModalType(null)}
                style={styles.closeBtn}
                activeOpacity={0.8}
              >
                <X size={17} color={Palette.aubergine} />
              </TouchableOpacity>
            </View>

            {/* Modal Body: Displays only the specific filter selected */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              {activeModalType === 'category' && (
                <View style={styles.pillsGrid}>
                  {categoryOptions.map((item) => {
                    const isAll = item.id === 'all';
                    const isSelected = isAll
                      ? tempCategories.includes('all')
                      : tempCategories.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          if (isAll) {
                            setTempCategories(['all']);
                          } else {
                            setTempCategories((prev) => {
                              const withoutAll = prev.filter((id) => id !== 'all');
                              if (withoutAll.includes(item.id)) {
                                const remaining = withoutAll.filter((id) => id !== item.id);
                                return remaining.length > 0 ? remaining : ['all'];
                              } else {
                                return [...withoutAll, item.id];
                              }
                            });
                          }
                        }}
                        style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                        activeOpacity={0.75}
                      >
                        {isSelected && (
                          <Check size={13} color="#FAF5ED" style={{ marginRight: 5 }} />
                        )}
                        <Text
                          style={[
                            styles.modalPillText,
                            isSelected && styles.modalPillTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {activeModalType === 'area' && (
                <View style={{ gap: 16 }}>
                  {/* State Section */}
                  <View>
                    <View style={styles.filterSectionHeader}>
                      <Text style={styles.filterSectionLabel}>STATE</Text>
                      {tempStateValue !== 'all' && (
                        <TouchableOpacity onPress={() => { setTempStateValue('all'); setTempCityValue('all'); }} hitSlop={8}>
                          <Text style={styles.filterClearText}>Clear state</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalPillsScroll}>
                      <TouchableOpacity
                        onPress={() => { setTempStateValue('all'); setTempCityValue('all'); }}
                        style={[styles.modalPill, tempStateValue === 'all' && styles.modalPillSelected]}
                        activeOpacity={0.75}
                      >
                        {tempStateValue === 'all' && <Check size={13} color="#FAF5ED" style={{ marginRight: 4 }} />}
                        <Text style={[styles.modalPillText, tempStateValue === 'all' && styles.modalPillTextSelected]}>All States</Text>
                      </TouchableOpacity>
                      {NIGERIAN_STATES.map((state) => {
                        const isSelected = tempStateValue.toLowerCase() === state.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={state}
                            onPress={() => {
                              setTempStateValue(state);
                              setTempCityValue('all');
                            }}
                            style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                            activeOpacity={0.75}
                          >
                            {isSelected && <Check size={13} color="#FAF5ED" style={{ marginRight: 4 }} />}
                            <Text style={[styles.modalPillText, isSelected && styles.modalPillTextSelected]}>{state}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* City / Area Section */}
                  <View>
                    <View style={styles.filterSectionHeader}>
                      <Text style={styles.filterSectionLabel}>
                        {tempStateValue === 'all' ? 'POPULAR CITIES & AREAS' : `CITIES IN ${tempStateValue.toUpperCase()}`}
                      </Text>
                      {tempCityValue !== 'all' && (
                        <TouchableOpacity onPress={() => setTempCityValue('all')} hitSlop={8}>
                          <Text style={styles.filterClearText}>Clear city</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.pillsGrid}>
                      <TouchableOpacity
                        onPress={() => setTempCityValue('all')}
                        style={[styles.modalPill, tempCityValue === 'all' && styles.modalPillSelected]}
                        activeOpacity={0.75}
                      >
                        {tempCityValue === 'all' && <Check size={13} color="#FAF5ED" style={{ marginRight: 4 }} />}
                        <Text style={[styles.modalPillText, tempCityValue === 'all' && styles.modalPillTextSelected]}>
                          {tempStateValue === 'all' ? 'All Locations' : `All Cities in ${tempStateValue}`}
                        </Text>
                      </TouchableOpacity>

                      {(tempStateValue === 'all'
                        ? availableAreas.filter(a => a !== 'All Areas' && a !== 'All Locations')
                        : getCitiesForState(tempStateValue, availableAreas.filter(a => a !== 'All Areas' && a !== 'All Locations'))
                      ).map((city) => {
                        const isSelected = tempCityValue.toLowerCase() === city.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={city}
                            onPress={() => setTempCityValue(city)}
                            style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                            activeOpacity={0.75}
                          >
                            {isSelected && <Check size={13} color="#FAF5ED" style={{ marginRight: 4 }} />}
                            <Text style={[styles.modalPillText, isSelected && styles.modalPillTextSelected]}>{city}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {activeModalType === 'budget' && (
                <View style={styles.pillsGrid}>
                  {PRICE_RANGE_OPTIONS.map((item) => {
                    const isSelected = tempValue === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setTempValue(item.id)}
                        style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                        activeOpacity={0.75}
                      >
                        {isSelected && (
                          <Check size={13} color="#FAF5ED" style={{ marginRight: 5 }} />
                        )}
                        <Text
                          style={[
                            styles.modalPillText,
                            isSelected && styles.modalPillTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {activeModalType === 'party' && (
                <View style={styles.pillsGrid}>
                  {PARTY_SIZE_OPTIONS.map((item) => {
                    const isSelected = tempValue === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setTempValue(item.id)}
                        style={[styles.modalPill, isSelected && styles.modalPillSelected]}
                        activeOpacity={0.75}
                      >
                        {isSelected && (
                          <Check size={13} color="#FAF5ED" style={{ marginRight: 5 }} />
                        )}
                        <Text
                          style={[
                            styles.modalPillText,
                            isSelected && styles.modalPillTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Action Footer: Reset + Apply */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                onPress={handleResetSingle}
                style={styles.resetButton}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApplySingle}
                style={styles.applyButton}
                activeOpacity={0.88}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: Palette.porcelain,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E8DBC6',
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 5,
    shadowColor: '#301D32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: Palette.aubergine,
    paddingVertical: 6,
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.mulberry,
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.aubergine,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: Palette.mulberry,
  },
  activeBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: Palette.goldInk,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFCF7',
  },
  activeBadgeText: {
    color: '#FFFCF7',
    fontSize: 9,
    fontWeight: '800',
  },
  filterRowScroll: {
    paddingTop: 10,
  },
  chipsScroll: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 6,
  },
  resetChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
  },
  resetChipLeftText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  resetChipDisabled: {
    opacity: 0.45,
    backgroundColor: 'rgba(116, 61, 96, 0.05)',
    borderColor: Palette.border,
  },
  resetChipDisabledText: {
    color: Palette.mutedText,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
  },
  chipActive: {
    backgroundColor: Palette.mulberry,
    borderColor: Palette.mulberry,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  chipTextActive: {
    color: '#FAF5ED',
    fontWeight: '700',
  },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(35, 17, 36, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFCF7',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingTop: 10,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 20,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(116, 61, 96, 0.25)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(116, 61, 96, 0.08)',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.aubergine,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(116, 61, 96, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.mutedText,
    letterSpacing: 0.6,
  },
  filterClearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  horizontalPillsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  pillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.porcelain,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  modalPillSelected: {
    backgroundColor: Palette.aubergine,
    borderColor: Palette.aubergine,
  },
  modalPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.aubergine,
  },
  modalPillTextSelected: {
    color: '#FAF5ED',
    fontWeight: '700',
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(116, 61, 96, 0.08)',
    gap: 12,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  applyButton: {
    flex: 1,
    backgroundColor: Palette.aubergine,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#301D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 4,
  },
  applyButtonText: {
    color: '#FAF5ED',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
