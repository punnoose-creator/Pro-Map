import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { pushCrashDebugLine } from './crashDebugBuffer';

type Props = { children: ReactNode };
type State = { error: Error | null };

const TAG = '[ProMap:Render]';

/** Catches React render errors and prints them (visible UI + console). */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(TAG, error.message, '\n', error.stack, '\ncomponentStack:', info.componentStack);
    pushCrashDebugLine(
      TAG,
      error.message,
      [error.stack, 'componentStack:', info.componentStack].filter(Boolean).join('\n')
    );
  }

  private clear = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>App error (debug)</Text>
          <Text style={styles.hint}>Copy the text below and search Metro / logcat for {TAG}</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text selectable style={styles.mono}>
              {error.message}
            </Text>
            <Text selectable style={styles.monoSmall}>
              {error.stack ?? ''}
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.btn} onPress={this.clear} activeOpacity={0.8}>
            <Text style={styles.btnTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 20,
    paddingTop: 48,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  hint: { color: '#888', fontSize: 12, marginBottom: 16 },
  scroll: { flex: 1, minHeight: 120, borderWidth: 1, borderColor: '#333', borderRadius: 8 },
  scrollContent: { padding: 12 },
  mono: { color: '#f97316', fontSize: 14, fontFamily: 'monospace' },
  monoSmall: { color: '#aaa', fontSize: 11, fontFamily: 'monospace', marginTop: 12 },
  btn: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnTxt: { color: '#111', fontWeight: '800' },
});
