import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';
import { Calendar, Trash2, X, Plus } from 'lucide-react-native';
import { COLORS } from '../config/colors';
import { ReminderService } from '../services/reminderService';
import { SpeechService } from '../services/speechService';

export function ReminderListModal({ visible, onClose, onAddVoiceReminder }) {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (visible) {
      loadReminders();
    }
  }, [visible]);

  const loadReminders = async () => {
    const list = await ReminderService.getAll();
    setReminders(list);
  };

  const handleDelete = async (id, title) => {
    await ReminderService.cancel(id);
    await loadReminders();
    await SpeechService.speak(`Deleted reminder for ${title}`);
  };

  const renderItem = ({ item }) => {
    const timeFormatted = new Date(item.scheduledFor).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateFormatted = new Date(item.scheduledFor).toLocaleDateString();

    return (
      <View
        style={styles.itemCard}
        accessible={true}
        accessibilityLabel={`Reminder: ${item.title} scheduled for ${timeFormatted} on ${dateFormatted}`}
      >
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemTime}>{`${timeFormatted} · ${dateFormatted}`}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.title)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Delete reminder ${item.title}`}
          style={styles.deleteButton}
        >
          <Trash2 size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Calendar size={28} color={COLORS.brandRed} />
              <Text style={styles.title}>REMINDERS</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close reminders modal"
              style={styles.closeButton}
            >
              <X size={26} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          {reminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No upcoming reminders.</Text>
              <Text style={styles.emptySubtext}>
                Say "Remind me to take medicine at 8 PM" to add one.
              </Text>
            </View>
          ) : (
            <FlatList
              data={reminders}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* Quick Voice Add Button */}
          <TouchableOpacity
            onPress={() => {
              onClose();
              if (onAddVoiceReminder) onAddVoiceReminder();
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add reminder by voice. Tap to speak your reminder."
            style={styles.addButton}
          >
            <Plus size={24} color="#000000" strokeWidth={3} />
            <Text style={styles.addButtonText}>ADD BY VOICE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    maxHeight: '80%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.brandRed,
    letterSpacing: 1.5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#26262C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 12,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E24',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 14,
    color: COLORS.brandRed,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: COLORS.brandRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
