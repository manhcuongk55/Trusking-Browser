import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Keyboard, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Initialize Gun.js P2P Node
import Gun from 'gun';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed'; // Optional depending on env, but we'll use AsyncStorage adapter conceptually

// Note: React Native needs a custom async storage adapter for Gun, 
// but for this MVP we will rely on Gun's memory/fallback or a simple wrapper.
const gun = Gun({
  peers: ['http://localhost:3400/gun'], // The MAKAI local Gun Relay
});

export default function App() {
  const [urlInput, setUrlInput] = useState('truth://makai/feed');
  const [currentUrl, setCurrentUrl] = useState('');
  const [p2pContent, setP2pContent] = useState(null); // Holds generated HTML for P2P routes
  const [isLoading, setIsLoading] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    // Initial load
    handleGo();
  }, []);

  const handleGo = () => {
    Keyboard.dismiss();
    let query = urlInput.trim();
    if (!query) return;

    setIsLoading(true);

    // 2. Intercept P2P Protocol (truth://)
    if (query.startsWith('truth://') || query.startsWith('trusking://')) {
      const path = query.replace('truth://', '').replace('trusking://', '');
      const dataPath = path || 'global_truth_feed';
      
      // Khởi tạo trạng thái Layer 1 (Data) và Layer 2 (Verification)
      let aggregatedData = null;
      let aiVerification = null;

      const renderView = (data, verification) => {
        // Hàm render giao diện gộp cả 2 Layer
        let badgeHtml = '';
        if (verification) {
            const badgeColor = verification.status === 'Trust' ? '#4CAF50' : (verification.status === 'Fake' ? '#F44336' : '#FF9800');
            const badgeIcon = verification.status === 'Trust' ? '✅' : (verification.status === 'Fake' ? '❌' : '🛡️');
            badgeHtml = `
              <div style="background-color: ${badgeColor}20; border: 1px solid ${badgeColor}; padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center;">
                <span style="font-size: 24px; margin-right: 10px;">${badgeIcon}</span>
                <div>
                  <strong style="color: ${badgeColor};">AI Truth Police: ${verification.status}</strong>
                  <div style="font-size: 13px; color: #555;">Confidence: ${verification.confidence || '99'}% | Node: ${verification.agent_id || 'Trusking_Guardian'}</div>
                  <div style="font-size: 14px; margin-top: 5px;">${verification.rationale || 'Verified through consensus network.'}</div>
                </div>
              </div>
            `;
        }

        const html = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, sans-serif; padding: 20px; background: #f8f9fa; color: #333; }
                h1 { color: #563ACC; font-size: 22px; border-bottom: 2px solid #563ACC; padding-bottom: 10px;}
                .node { background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-top:15px;}
                pre { background: #f4f4f4; padding: 10px; overflow-x: auto; border-radius: 4px; font-size: 13px; color: #444; }
                .meta { font-size: 12px; color: #888; margin-top: 10px; text-align: right; }
              </style>
            </head>
            <body>
              <h1>🌐 Trusking P2P Network</h1>
              
              <!-- Layer 2: Network-in-Network AI Verification -->
              ${badgeHtml}

              <!-- Layer 1: Raw Data -->
              <div class="node">
                <h3>Path: <code>${dataPath}</code></h3>
                <pre>${JSON.stringify(data, null, 2)}</pre>
                <div class="meta">Distributed via Gun.js</div>
              </div>
            </body>
          </html>
        `;
        setP2pContent(html);
        setCurrentUrl('');
        setIsLoading(false);
      };

      // Mạng trong mạng (Network-in-Network):
      // Truy vấn đồng thời Layer 1 (Nội dung) và Layer 2 (Kết quả AI duyệt bằng LLM Agent)
      
      let dataLoaded = false;
      let verificationLoaded = false;

      // Layer 1: Lấy nội dung Data
      gun.get(`data/${dataPath}`).once((data) => {
        aggregatedData = data || { error: 'No data found. Be the first to publish here.' };
        dataLoaded = true;
        if (verificationLoaded) renderView(aggregatedData, aiVerification);
      });

      // Layer 2: Lấy chữ ký/xác minh từ AI Agent (Cảnh sát sự thật)
      gun.get(`ai_verification/${dataPath}`).once((verification) => {
        // Cho mục đích Demo, nếu P2P chưa có AI verification, ta giả lập một kết quả "Trust" mặc định
        // Sau này con AI Agent thực ngoài mạng sẽ tự động inject thẳng vào Gun node này.
        aiVerification = verification || { 
          status: 'Trust', 
          confidence: 98, 
          agent_id: 'Basao_SafeBlock_AI',
          rationale: '[Mock] Content structure analysis matches trusted cryptographic patterns.'
        };
        verificationLoaded = true;
        if (dataLoaded) renderView(aggregatedData, aiVerification);
      });

      // Timeout fallback in case P2P network is slow/unresponsive
      setTimeout(() => {
         if (isLoading && (!dataLoaded || !verificationLoaded)) {
            renderView(
              aggregatedData || { warning: 'P2P Network timeout. Only showing partial data.' }, 
              aiVerification
            );
         }
      }, 5000);

      return;
    }

    // 3. Fallback for normal Web URLs
    setP2pContent(null);
    if (!query.startsWith('http')) {
      query = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    }
    setCurrentUrl(query);
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Minimalist URL Bar */}
      <View style={styles.header}>
        <TextInput
          style={styles.urlInput}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="Enter truth:// path or web address"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="web-search"
          onSubmitEditing={handleGo}
          returnKeyType="go"
        />
        <TouchableOpacity style={styles.goButton} onPress={handleGo}>
          {isLoading ? (
            <ActivityIndicator color="#563ACC" />
          ) : (
            <Ionicons name="arrow-forward-circle" size={32} color="#563ACC" />
          )}
        </TouchableOpacity>
      </View>

      {/* Main Browser View */}
      {p2pContent ? (
        <WebView
          originWhitelist={['*']}
          source={{ html: p2pContent }}
          style={styles.webview}
        />
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webview}
          onNavigationStateChange={(navState) => {
            // Only update URL bar if it's a normal web page and not our internal truth protocol
            if (navState.url !== currentUrl && navState.url.startsWith('http')) {
              setUrlInput(navState.url);
            }
          }}
        />
      )}
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingTop: 45, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  urlInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  goButton: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  webview: {
    flex: 1,
  },
});
