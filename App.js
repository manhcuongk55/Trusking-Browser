import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Keyboard, ActivityIndicator, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gun from 'gun';

// 1. Khởi tạo Relay Nội Bộ (Trusking Node)
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed'; 

const gun = Gun({
  peers: ['http://localhost:3400/gun'],
});

export default function App() {
  const [urlInput, setUrlInput] = useState('truth://makai/news/fire-vincom');
  const [currentUrl, setCurrentUrl] = useState('');
  const [p2pContent, setP2pContent] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  
  // BTVE Truth Meter State
  const [truthScore, setTruthScore] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const webViewRef = useRef(null);

  useEffect(() => {
    // Initial load
    handleGo();
  }, []);

  // Hàm mô phỏng BTVE chạy Local trong Browser (WebRTC/WebCrypto Mock)
  const runLocalBTVE = async (path) => {
    setIsVerifying(true);
    setTruthScore(null);
    
    // Giả lập trễ mạng P2P thu thập bằng chứng từ các Node lân cận (WebRTC mesh)
    setTimeout(() => {
      // Bằng chứng giả lập trả về từ DHT P2P Mạng lưới
      const evidenceData = [
        { type: 'video', nodeTrust: 0.9, proximityMeters: 50, validSignature: true },
        { type: 'photo', nodeTrust: 0.6, proximityMeters: 200, validSignature: true },
        { type: 'text', nodeTrust: 0.2, proximityMeters: 1500, validSignature: false }, // Fake/Tampered
      ];

      let score = 0;
      let validNodes = 0;

      // Công thức lõi BTVE: TruthScore = Σ (Trust × EvidenceWeight × Proximity)
      evidenceData.forEach(ev => {
        // Nếu WebCrypto chữ ký số Fail -> Loại bỏ ngay lập tức (Chống Fake/Deepfake)
        if (!ev.validSignature) return; 

        validNodes++;
        const weight = ev.type === 'video' ? 10 : (ev.type === 'photo' ? 5 : 1);
        const proxScore = ev.proximityMeters < 100 ? 1.5 : (ev.proximityMeters < 500 ? 1.0 : 0.5);
        
        score += (ev.nodeTrust * weight * proxScore);
      });

      // Scale điểm về 100% để hiển thị (Giả định max score là ~20 cho 1 cụm sự kiện nhỏ)
      const finalPercentage = Math.min(Math.round((score / 20) * 100), 100);
      
      setTruthScore({
        percentage: finalPercentage,
        peersAssisted: validNodes,
        status: finalPercentage > 70 ? 'VERIFIED' : (finalPercentage > 40 ? 'SUSPICIOUS' : 'UNVERIFIED')
      });
      setIsVerifying(false);

    }, 2500); // 2.5 giây chạy thuật toán
  };

  const handleGo = () => {
    Keyboard.dismiss();
    let query = urlInput.trim();
    if (!query) return;

    setIsLoading(true);
    setP2pContent(null);
    setTruthScore(null);

    // Bắt giao thức Mạng Sự Thật (P2P BTVE)
    if (query.startsWith('truth://') || query.startsWith('trusking://')) {
      const path = query.replace('truth://', '').replace('trusking://', '');
      const dataPath = path || 'global_truth_feed';
      
      // Kích hoạt BTVE Engine chạy Local
      runLocalBTVE(dataPath);

      // Render nội dung (Layer 1) và AI Police (Layer 2)
      let aggregatedData = null;
      let aiVerification = null;

      const renderView = (data, verification) => {
        const html = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, sans-serif; padding: 20px; background: #f8f9fa; color: #333; }
                h1 { color: #563ACC; font-size: 20px; border-bottom: 2px solid #563ACC; padding-bottom: 10px;}
                .node { background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-top:20px; border: 1px solid #eaeaea;}
                pre { background: #f4f4f4; padding: 10px; overflow-x: auto; border-radius: 4px; font-size: 13px; color: #444; }
                .ai-badge { background-color: #E8F5E9; border: 1px solid #4CAF50; padding: 12px; border-radius: 8px; margin-top: 15px; display: flex; align-items: flex-start; }
                .ai-icon { font-size: 20px; margin-right: 10px; }
              </style>
            </head>
            <body>
              <h1>🌐 Trusking / ${dataPath.split('/').pop()}</h1>
              
              <div class="node">
                <p style="color: #666; font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Decentralized Content (Layer 1)</p>
                <div style="font-size: 16px; line-height: 1.5;">
                  ${data?.content || JSON.stringify(data)}
                </div>
                <div style="font-size: 11px; color: #999; margin-top: 15px;">Cryptographic Hash: QmXyZ...aBc</div>
              </div>

               ${verification ? `
              <div class="ai-badge">
                <span class="ai-icon">🛡️</span>
                <div>
                  <strong style="color: #2E7D32;">AI Layer 2: ${verification.status}</strong>
                  <div style="font-size: 12px; color: #666; margin-top: 2px;">${verification.rationale}</div>
                </div>
              </div>
              ` : ''}
              
              <div style="margin-top: 30px; text-align: center; color: #aaa; font-size: 11px;">Powered by BTVE P2P Protocol</div>
            </body>
          </html>
        `;
        setP2pContent(html);
        setCurrentUrl('');
        setIsLoading(false);
      };

      // Mock fetching logic cho P2P
      setTimeout(() => {
         renderView(
           { content: "🔥🚨 BREAKING: Có báo cáo cháy lớn tại khu vực Vincom. Đám mây khói đen bốc lên từ tầng 4. Các đơn vị PCCC đang tiếp cận hiện trường." },
           { status: 'Trust', rationale: '[System] LLM phân tích văn bản khớp với mô hình khẩn cấp. Không chứa mã độc.'}
         );
      }, 500);

      return;
    }

    // 3. Fallback web bình thường 
    if (!query.startsWith('http')) {
      query = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    }
    setCurrentUrl(query);
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh Bar */}
      <View style={styles.header}>
        <TextInput
          style={styles.urlInput}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="truth:// path or https://"
          autoCapitalize="none"
          autoCorrect={false}
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

      {/* BTVE TRUTH METER (Lớp 3) */}
      {(isVerifying || truthScore) && p2pContent && (
        <View style={styles.truthMeterContainer}>
          <View style={styles.truthMeterHeader}>
            <Ionicons name="analytics" size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.truthMeterTitle}>Browser Truth Verification Engine</Text>
          </View>
          
          <View style={styles.truthMeterBody}>
            {isVerifying ? (
              <View style={styles.verifyingState}>
                <ActivityIndicator color="#563ACC" size="small" />
                <Text style={styles.verifyingText}>Broadcasting WebRTC Request to nearby nodes...</Text>
              </View>
            ) : (
              <View style={styles.scoreState}>
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreNumber, {color: truthScore.percentage > 70 ? '#4CAF50' : '#FF9800'}]}>
                    {truthScore.percentage}%
                  </Text>
                  <Text style={styles.scoreLabel}>TRUTH SCORE</Text>
                </View>
                <View style={styles.scoreDetails}>
                  <Text style={styles.scoreStatus}>{truthScore.status}</Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="people" size={12} /> Verified by {truthScore.peersAssisted} local peers
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="lock-closed" size={12} /> WebCrypto Signatures Valid
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="location" size={12} /> High Proximity Evidence
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Màn hình Browser */}
      {p2pContent ? (
        <WebView originWhitelist={['*']} source={{ html: p2pContent }} style={styles.webview} />
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webview}
          onNavigationStateChange={(navState) => {
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
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  header: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, paddingTop: 45, 
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3,
  },
  urlInput: {
    flex: 1, height: 44, backgroundColor: '#f6f6f6', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#eaeaea',
  },
  goButton: { marginLeft: 12, justifyContent: 'center', alignItems: 'center', width: 32, height: 32 },
  webview: { flex: 1 },
  
  // Truth Meter Styles
  truthMeterContainer: {
    margin: 12, backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#563ACC', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
    borderWidth: 1, borderColor: '#563ACC30', overflow: 'hidden'
  },
  truthMeterHeader: {
    backgroundColor: '#563ACC', paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center'
  },
  truthMeterTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  truthMeterBody: { padding: 15 },
  verifyingState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  verifyingText: { marginLeft: 10, color: '#666', fontSize: 13, fontStyle: 'italic' },
  scoreState: { flexDirection: 'row', alignItems: 'center' },
  scoreCircle: { 
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#f0f0f0', 
    justifyContent: 'center', alignItems: 'center', borderTopColor: '#4CAF50', borderRightColor: '#4CAF50'
  },
  scoreNumber: { fontSize: 24, fontWeight: '900' },
  scoreLabel: { fontSize: 8, fontWeight: 'bold', color: '#888', marginTop: 2 },
  scoreDetails: { marginLeft: 20, flex: 1 },
  scoreStatus: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  scoreSubtext: { fontSize: 12, color: '#666', marginBottom: 2 },
});
