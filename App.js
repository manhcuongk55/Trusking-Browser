import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Keyboard, ActivityIndicator, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gun from 'gun';
import * as Crypto from 'expo-crypto'; // Module Crypto để mã hóa Identity

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
  const [p2pData, setP2pData] = useState(null); // Lưu trữ metadata để WebView render
  const [isLoading, setIsLoading] = useState(false);
  
  // BTVE Truth Meter State
  const [truthScore, setTruthScore] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [evidenceList, setEvidenceList] = useState([]); // Chứa bằng chứng real-time từ mạn lưới P2P

  // Trust Economy State (Bodhi Wallet)
  const [bodhiPoints, setBodhiPoints] = useState(50); // Điểm khởi tạo
  const [minedReward, setMinedReward] = useState(null); // Trạng thái show thông báo đào thành công
  
  // Privacy Protection State (Pillar 4)
  const [anonymousId, setAnonymousId] = useState('Generating ID...');

  const webViewRef = useRef(null);

  useEffect(() => {
    // Khởi tạo Identity Ẩn danh (Privacy Layer)
    const generateIdentity = async () => {
      // Giả lập Public Key
      const rawPublicKey = `pub_key_${Math.random()}`;
      // Sinh Mã băm (Hash) làm định danh, che giấu danh tính thật
      const hashedId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
         rawPublicKey
      );
      setAnonymousId(`0x${hashedId.substring(0, 8).toUpperCase()}`);
    };
    generateIdentity();

    // Initial load
    handleGo();
  }, []);

  // Effect: Render lại WebView HTML ngay khi Truth Graph (truthScore) được tính toán xong
  useEffect(() => {
    if (!p2pData) return;

    let evidenceRows = '';
    if (truthScore && truthScore.evidenceGraph) {
       evidenceRows = truthScore.evidenceGraph.map(ev => `
         <tr style="${ev.has_conflict ? 'background-color: #ffebee;' : ''}">
           <td><code style="color:#8E24AA">${ev.id}</code></td>
           <td>${ev.type.toUpperCase()}<br/><span style="font-size:8px; color:#999">🔒 Encrypted</span></td>
           <td>${ev.hashed_region}</td>
           <td>${(ev.node_trust * 100).toFixed(0)}%</td>
           <td style="color: ${ev.has_conflict ? '#D32F2F' : '#388E3C'}; font-weight:bold;">
              ${ev.has_conflict ? '-' + Math.abs(ev.calculated_score).toFixed(1) : '+' + ev.calculated_score.toFixed(1)}
           </td>
         </tr>
       `).join('');
    }

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, sans-serif; padding: 20px; background: #fdfbf7; color: #4E342E; margin:0;}
            h1 { color: #8E24AA; font-size: 20px; border-bottom: 2px solid #8E24AA; padding-bottom: 10px;}
            .node { background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 4px 12px rgba(161,136,127,0.1); margin-top:20px; border: 1px solid #f0e6e6;}
            .evidence-graph { margin-top: 25px; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; background: #fff; }
            .evidence-header { background: #5D4037; color: #fff; padding: 10px 15px; font-weight: bold; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
            th { background-color: #f5f5f5; color: #666; font-weight: 600; }
            .formula-box { background: #f3e5f5; border-left: 4px solid #8E24AA; padding: 10px; margin-top: 15px; font-size: 12px; color: #4A148C; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>🌐 Trusking / ${p2pData.path.split('/').pop()}</h1>
          
          <div class="node">
            <p style="color: #666; font-size: 12px; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Decentralized Content (Layer 1)</p>
            <div style="font-size: 16px; line-height: 1.5; color: #212121;">
              ${p2pData.content}
            </div>
            <div style="font-size: 11px; color: #999; margin-top: 15px;">Cryptographic Hash: QmXyz_0987_aBc</div>
          </div>

          ${truthScore ? `
          <div class="evidence-graph">
             <div class="evidence-header">🔍 EVIDENCE GRAPH BREAKDOWN (Privacy Preserved)</div>
             <table>
               <tr><th>Anon Node ID</th><th>Evidence</th><th>Hashed Region</th><th>Trust</th><th>Score Effect</th></tr>
               ${evidenceRows}
             </table>
             <div class="formula-box">
                Σ (Base + Weight×Prox + NodeTrust + Witness) - Conflict<br>
                Total Accumulated Score: ${truthScore.percentage}/100
             </div>
          </div>
          ` : '<div style="margin-top:20px; text-align:center; color:#888; font-size:12px;">Waiting for DePIN Truth Engine calculation...</div>'}
          
          <div style="margin-top: 30px; text-align: center; color: #aaa; font-size: 11px;">Powered by 0-cost Local DePIN (Decentralized Physical Infrastructure Networks)</div>
        </body>
      </html>
    `;
    setP2pContent(html);
    setIsLoading(false);
  }, [p2pData, truthScore]);

  // Thay vì chạy 1 lần với Mock Data, giờ BTVE là cỗ máy tính toán liên tục dựa trên mảng `evidenceGraph` truyền vào
  const calculateTruthScore = (evidenceGraph) => {
    setIsVerifying(true);
    
    /* THUẬT TOÁN LÕI (TRUTH ENGINE)
       TruthScore = SourceTrust + EvidenceWeight + WitnessCount + Proximity - ConflictPenalty
    */
    let totalScore = 0;
    let validWitnesses = 0;
    let totalConflicts = 0;

    // Tính điểm cơ sở (Giả định nguồn phát ban đầu có uy tín trung bình)
    const baseSourceTrust = 20; 
    totalScore += baseSourceTrust;

    if (!evidenceGraph || evidenceGraph.length === 0) {
      setTruthScore(null);
      setIsVerifying(false);
      return;
    }

    const evidenceDetails = evidenceGraph.map(ev => {
      // 1. Phạt mâu thuẫn (Conflict/Deepfake)
      if (ev.has_conflict) {
        totalConflicts++;
        const penalty = 15;
        totalScore -= penalty;
        return { ...ev, calculated_score: -penalty, status: 'REJECTED (Conflict)' };
      }

      validWitnesses++;

      // 2. Evidence Weight
      let evWeight = 0;
      if (ev.type === 'video') evWeight = 15;
      else if (ev.type === 'photo') evWeight = 10;
      else if (ev.type === 'text') evWeight = 2;

      // 3. Proximity (Khoảng cách) -> Giờ dùng hashed_region thay vì số mét chính xác
      let proxMultiplier = 1.0;
      // Trong thực tế sẽ đo độ khít của Hashed Region, demo mặc định ở mức 1.5
      if (ev.hashed_region && ev.hashed_region.includes('5km')) proxMultiplier = 1.5;

      // 4. Node Trust (Uy tín của Node)
      const nodeScore = ev.node_trust * 10;

      const contribution = (evWeight * proxMultiplier) + nodeScore;
      totalScore += contribution;

      return { ...ev, calculated_score: contribution, status: 'ACCEPTED' };
    });

    // 5. Thưởng Witness Count
    if (validWitnesses >= 3) {
      totalScore += (validWitnesses * 2); 
    }

    const finalPercentage = Math.max(0, Math.min(Math.round(totalScore), 100));
    
    setTruthScore({
      percentage: finalPercentage,
      peersAssisted: validWitnesses,
      conflictsCaught: totalConflicts,
      status: finalPercentage > 75 ? 'VERIFIED' : (finalPercentage > 40 ? 'SUSPICIOUS' : 'UNVERIFIED'),
      evidenceGraph: evidenceDetails 
    });
    setIsVerifying(false);

    // Trust Economy: MINT TOKEN (Proof-of-Truth) - Demo Trigger
    if (finalPercentage > 75 && totalConflicts === 0) {
      setBodhiPoints(prev => prev + 5);
      setMinedReward('+5 Bodhi Points Mined!');
      setTimeout(() => setMinedReward(null), 4000);
    } else if (totalConflicts > 0) {
      setBodhiPoints(prev => Math.max(0, prev - 15));
      setMinedReward('-15 Points (Conflict Penalty)');
      setTimeout(() => setMinedReward(null), 4000);
    }
  };

  // Effect Trigger: Tính lại Sự Thật ngay khi Danh sách Bằng chứng P2P thay đổi
  useEffect(() => {
    if (evidenceList.length > 0) {
      calculateTruthScore(evidenceList);
    }
  }, [evidenceList]);

  // Hành động đóng góp Bằng chứng lên Mạng Lưới
  const submitEvidence = () => {
    if (!p2pData || !p2pData.path) return;
    setIsLoading(true);

    const newEvidence = {
      id: anonymousId,
      type: ['photo', 'video', 'text'][Math.floor(Math.random() * 3)],
      node_trust: Math.min(bodhiPoints / 100, 1.0), // Trust lấy sinh ra từ ví Bodhi
      hashed_region: `Zone_${Math.floor(Math.random() * 999)} (5km²)`, // Zero-Knowledge Location
      has_conflict: Math.random() > 0.85 // 15% xác suất tạo bằng chứng nhiễu/conflict
    };

    // Đẩy Bằng Chứng trực tiếp vào Lõi Mạng P2P Gun.js
    gun.get('truth_layer').get(p2pData.path).get('evidence').set(newEvidence, (ack) => {
      setIsLoading(false);
    });
  };

  const handleGo = () => {
    Keyboard.dismiss();
    let query = urlInput.trim();
    if (!query) return;

    setIsLoading(true);
    setP2pContent(null);
    setP2pData(null);
    setTruthScore(null);
    setEvidenceList([]); // Reset bằng chứng cũ

    // Bắt giao thức Mạng Sự Thật (P2P BTVE) - Zero Infrastructure Cost
    if (query.startsWith('truth://') || query.startsWith('trusking://')) {
      const path = query.replace('truth://', '').replace('trusking://', '');
      const dataPath = path || 'global_truth_feed';
      
      // Lắng nghe Content từ Node Khác (Như AI Agent)
      gun.get('truth_layer').get(dataPath).once((data) => {
        if (data && data.content) {
          setP2pData({
            path: dataPath,
            content: data.content,
            timestamp: data.timestamp || Date.now()
          });

          // Lắng nghe Bằng Chứng Động MỚI LIÊN TỤC từ Mạng Lưới
          gun.get('truth_layer').get(dataPath).get('evidence').map().on((evData, evId) => {
            if (evData && evData.id) {
               setEvidenceList(prev => {
                 // Tránh trùng lặp mảng
                 const exists = prev.find(e => e._id === evId);
                 if (exists) return prev;
                 return [...prev, { ...evData, _id: evId }];
               });
            }
          });

        } else {
          setP2pData({
            path: dataPath,
            content: "Lỗi 404: Không tìm thấy Dữ liệu Sự thật trên Mạng lưới. Có thể là 1 Bài Mới. Hãy làm Bodhi Node đầu tiên!"
          });
          setIsLoading(false);
        }
      });

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
      {/* V-ID Trust Economy Wallet Bar */}
      <View style={styles.walletBar}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Ionicons name="shield-checkmark" size={16} color="#4A148C" style={{marginRight: 4}} />
          <Text style={styles.walletNodeId}> ANON_ID: {anonymousId}</Text>
        </View>
        <View style={styles.walletPoints}>
          <Text style={styles.pointsText}>{bodhiPoints} Bodhi Pts</Text>
          <Ionicons name="diamond" size={14} color="#8E24AA" />
        </View>
      </View>
      
      {/* Thông báo Đào Coin (Proof-of-Truth) */}
      {minedReward && (
        <View style={[styles.miningAlert, {backgroundColor: minedReward.includes('+') ? '#E8F5E9' : '#FFEBEE'}]}>
          <Text style={[styles.miningText, {color: minedReward.includes('+') ? '#2E7D32' : '#C62828'}]}>
            {minedReward}
          </Text>
        </View>
      )}

      {/* Thanh Bar URL */}
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
      {(isVerifying || truthScore || p2pData) && p2pContent && (
        <View style={styles.truthMeterContainer}>
          <View style={styles.truthMeterHeader}>
            <Ionicons name="flower-outline" size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.truthMeterTitle}>Budai Awakening Verification</Text>
          </View>
          
          <View style={styles.truthMeterBody}>
            {isVerifying && !truthScore ? (
              <View style={styles.verifyingState}>
                <ActivityIndicator color="#8E24AA" size="small" />
                <Text style={styles.verifyingText}>Awakening Bodhi Nodes nearby...</Text>
              </View>
            ) : truthScore ? (
              <View style={styles.scoreState}>
                <View style={styles.scoreCircle}>
                  <Text style={[styles.scoreNumber, {color: truthScore.percentage > 70 ? '#4CAF50' : '#FF9800'}]}>
                    {truthScore.percentage}%
                  </Text>
                  <Text style={styles.scoreLabel}>AWAKENING</Text>
                </View>
                <View style={styles.scoreDetails}>
                  <Text style={[styles.scoreStatus, {color: truthScore.percentage > 70 ? '#2E7D32' : '#E65100'}]}>
                    {truthScore.percentage > 70 ? 'TRUTH AWAKENED' : 'CLOUDS OF DOUBT'}
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="people" size={12} color="#8E24AA" /> Verified by {truthScore.peersAssisted} Bodhi Nodes
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="lock-closed" size={12} color="#8E24AA" /> WebCrypto Dharma Seals Valid
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="location" size={12} color="#8E24AA" /> Proximate Reality Grounded
                  </Text>
                </View>
              </View>
            ) : (
               <View style={styles.verifyingState}>
                 <Text style={styles.verifyingText}>Chưa có Nút nào đóng góp Bằng chứng cho Vụ này.</Text>
               </View>
            )}

            {/* Nút Đóng góp Bằng chứng P2P */}
            <TouchableOpacity style={styles.submitEvidenceBtn} onPress={submitEvidence}>
               <Ionicons name="add-circle" size={18} color="#fff" style={{marginRight: 8}}/>
               <Text style={{color: '#fff', fontWeight:'bold'}}>Contribute Encrypted Evidence</Text>
            </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#fdfbf7' }, // Màu nền ấm tựa giấy cũ
  
  // Wallet Bar
  walletBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#f3e5f5',
    borderBottomWidth: 1, borderBottomColor: '#e1bee7',
  },
  walletNodeId: { fontSize: 12, fontWeight: 'bold', color: '#4A148C' },
  walletPoints: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width: 0, height: 1}, shadowRadius: 2, elevation: 1 },
  pointsText: { fontSize: 12, fontWeight: '800', color: '#8E24AA', marginRight: 4 },
  
  miningAlert: {
    padding: 8, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 90, alignSelf: 'center', zIndex: 10, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width: 0, height: 2}, shadowRadius: 4, elevation: 3, paddingHorizontal: 20
  },
  miningText: { fontSize: 13, fontWeight: 'bold' },

  header: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, 
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0e6e6',
    alignItems: 'center', shadowColor: '#A1887F', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3,
  },
  urlInput: {
    flex: 1, height: 44, backgroundColor: '#fcfaf8', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, color: '#4E342E', borderWidth: 1, borderColor: '#e8dfdf',
  },
  goButton: { marginLeft: 12, justifyContent: 'center', alignItems: 'center', width: 32, height: 32 },
  webview: { flex: 1 },
  
  // Truth Meter Styles (Budai Theme)
  truthMeterContainer: {
    margin: 12, backgroundColor: '#fff', borderRadius: 12,
    shadowColor: '#8E24AA', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
    borderWidth: 1, borderColor: '#8E24AA30', overflow: 'hidden'
  },
  truthMeterHeader: {
    backgroundColor: '#8E24AA', paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' // Deep Lotus Purple
  },
  truthMeterTitle: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  truthMeterBody: { padding: 15 },
  verifyingState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  verifyingText: { marginLeft: 10, color: '#666', fontSize: 13, fontStyle: 'italic' },
  scoreState: { flexDirection: 'row', alignItems: 'center' },
  scoreCircle: { 
    width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#f3e5f5', 
    justifyContent: 'center', alignItems: 'center', borderTopColor: '#D81B60', borderRightColor: '#D81B60' // Lotus Pink Highlight
  },
  scoreNumber: { fontSize: 24, fontWeight: '900', color: '#4E342E' },
  scoreLabel: { fontSize: 8, fontWeight: 'bold', color: '#8E24AA', marginTop: 2 },
  scoreDetails: { marginLeft: 20, flex: 1 },
  scoreStatus: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  scoreSubtext: { fontSize: 12, color: '#5D4037', marginBottom: 3 },

  submitEvidenceBtn: {
    backgroundColor: '#D81B60', padding: 12, borderRadius: 8, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'center', marginTop: 15,
    shadowColor: '#D81B60', shadowOpacity: 0.3, shadowOffset: {height: 2, width: 0}, shadowRadius: 5
  }
});
