import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Todo } from '../types/db';
import { useTheme } from '../theme/ThemeProvider';
import { patchTask, deleteTask, toggleTaskDone } from '../lib/data';

export default function SubtaskRow({ task }: { task: Todo }) {
  const { colors } = useTheme();
  const [text, setText] = useState(task.text);

  useEffect(() => { setText(task.text); }, [task.text]);

  const onBlur = async () => {
    const t = text.trim();
    if (!t) {
      await deleteTask(task.id).catch(() => {});
      return;
    }
    if (t !== task.text) patchTask(task.id, { text: t });
  };

  const toggle = async () => {
    Haptics.selectionAsync();
    await toggleTaskDone(task).catch(() => {});
  };

  return (
    <View style={[styles.row, { borderBottomColor: colors.border2 }]}>
      <TouchableOpacity
        onPress={toggle}
        style={[
          styles.chk,
          { borderColor: task.done ? colors.accent : colors.border },
          task.done && { backgroundColor: colors.accent },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {task.done && <MaterialIcons name="check" size={12} color="#fff" />}
      </TouchableOpacity>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={onBlur}
        editable={!task.done}
        style={[
          styles.input,
          { color: task.done ? colors.text4 : colors.text },
          task.done && { textDecorationLine: 'line-through' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  chk: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 14, paddingVertical: 2 },
});
