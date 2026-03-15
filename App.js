import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, Keyboard, ActivityIndicator, ScrollView, Share, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [urlInput, setUrlInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [isHome, setIsHome] = useState(true); // Phase 11: Màn hình Home mặc định
  const [homeFeedList, setHomeFeedList] = useState([]); // Chứa danh sách Hot Claims
  const [p2pContent, setP2pContent] = useState(null); 
  const [p2pData, setP2pData] = useState(null); // Lưu trữ metadata để WebView render
  const [isLoading, setIsLoading] = useState(false);
  
  // BTVE Truth Meter State
  const [truthScore, setTruthScore] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [evidenceList, setEvidenceList] = useState([]); // Chứa bằng chứng real-time từ mạn lưới P2P

  // Brand Domain Safety State (Phase 10)
  const [currentDomain, setCurrentDomain] = useState(null);
  const [brandSafetyScore, setBrandSafetyScore] = useState(0);

  // Trust Economy State (Bodhi Wallet)
  const [bodhiPoints, setBodhiPoints] = useState(50); // Điểm khởi tạo
  const [minedReward, setMinedReward] = useState(null); // Trạng thái show thông báo đào thành công
  
  // Phase 12: Leaderboard State
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);

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

    // Phase 11: Daily Login Bonus & Load Home Feed
    const loadHomeData = async () => {
      // 1. Daily Login Bonus check (Mock)
      const lastLogin = await AsyncStorage.getItem('last_login');
      const today = new Date().toDateString();
      if (lastLogin !== today) {
         setTimeout(() => {
           setBodhiPoints(prev => prev + 10);
           setMinedReward('Daily Login: +10 Bodhi Pts 🎁');
           setTimeout(() => setMinedReward(null), 4000);
         }, 1500);
         await AsyncStorage.setItem('last_login', today);
      }

      // 2. Load Trending P2P Feed (Seed Mock Data into Gun for Demo)
      const seedFeed = [
         { id: '1', path: 'news/fire-vincom', title: 'Khói mù mịt tại ngã tư Vincom Bà Triệu', score: 45, witnesses: 1 },
         { id: '2', path: 'news/fake-rice', title: 'Phát hiện gạo giả tại Cửa hàng X', score: 20, witnesses: 0 },
         { id: '3', path: 'community/accident-q1', title: 'Tai nạn dây chuyền 5 ô tô tại cầu Sài Gòn', score: 90, witnesses: 6 },
      ];
      setHomeFeedList(seedFeed);
      
      // 3. Phase 12: Load Leaderboard Mock Data
      setLeaderboardData([
         { rank: 1, id: '0xBA9F...2C1', points: 12450 },
         { rank: 2, id: '0x1F2A...9B3', points: 9800 },
         { rank: 3, id: '0x7C9D...4E5', points: 8420 },
         { rank: 4, id: '0x3B8E...1A2', points: 5100 },
         { rank: 5, id: '0x9D4C...8F7', points: 4200 },
      ]);
    };

    generateIdentity();
    loadHomeData();
  }, []);

  // Effect: Render lại WebView HTML ngay khi Truth Graph (truthScore) được tính toán xong
  useEffect(() => {
    if (!p2pData) return;

    let evidenceRows = '';
    if (truthScore && truthScore.evidenceGraph) {
       evidenceRows = truthScore.evidenceGraph.map(ev => `
         <tr style="${ev.has_conflict ? 'background-color: #fff0f0;' : ''}">
           <td><code style="color:#8E24AA; font-weight: 600;">${ev.id}</code></td>
           <td><span class="pill">${ev.type.toUpperCase()}</span><br/><span style="font-size:9px; color:#aaa; margin-top:4px; display:inline-block;">🔒 Encrypted</span></td>
           <td style="color:#555; font-size: 11px">${ev.hashed_region}</td>
           <td style="font-weight:600; color:#444;">${(ev.node_trust * 100).toFixed(0)}%</td>
           <td style="color: ${ev.has_conflict ? '#D32F2F' : '#2E7D32'}; font-weight:800; font-size:13px;">
              ${ev.has_conflict ? '-' + Math.abs(ev.calculated_score).toFixed(1) : '+' + ev.calculated_score.toFixed(1)}
           </td>
         </tr>
       `).join('');
    }

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Outfit', -apple-system, sans-serif; padding: 24px; background: #faf9f6; color: #333; margin:0;}
            h1 { color: #4A148C; font-size: 22px; font-weight: 800; border-bottom: 2px solid rgba(81, 45, 168, 0.1); padding-bottom: 12px; margin-bottom: 24px;}
            
            .node { background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 16px; box-shadow: 0 10px 30px rgba(81, 45, 168, 0.05); border: 1px solid rgba(255,255,255,0.6); backdrop-filter: blur(10px); }
            .node-label { color: #9E9E9E; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 8px;}
            .node-content { font-size: 16px; line-height: 1.6; color: #212121; font-weight: 400; }
            .crypto-hash { font-size: 10px; color: #9E9E9E; margin-top: 16px; font-family: monospace; background: #f0f0f0; display: inline-block; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.5px;}
            
            .evidence-graph { margin-top: 32px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,0.04); background: #fff; box-shadow: 0 12px 40px rgba(81, 45, 168, 0.08); }
            .evidence-header { background: linear-gradient(135deg, #4A148C 0%, #8E24AA 100%); color: #fff; padding: 14px 20px; font-weight: 800; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #f5f5f5; }
            th { background-color: #fafafa; color: #757575; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;}
            tr:last-child td { border-bottom: none; }
            .formula-box { background: rgba(142, 36, 170, 0.04); border-left: 4px solid #8E24AA; padding: 14px 20px; font-size: 12px; color: #4A148C; font-family: monospace; }
            
            .pill { background: rgba(142,36,170,0.1); color: #8E24AA; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 10px; letter-spacing: 0.5px; }
            .waiting-lbl { margin-top:30px; text-align:center; color:#9E9E9E; font-size:13px; font-weight: 600; letter-spacing: 0.5px;}
          </style>
        </head>
        <body>
          <h1>🌐 Trusking / ${p2pData.path.split('/').pop()}</h1>
          
          <div class="node">
            <div class="node-label">Decentralized Content (Layer 1)</div>
            <div class="node-content">
              ${p2pData.content}
            </div>
            <div class="crypto-hash">Hash: QmXyz_0987_aBc_${Math.random().toString(36).substring(7)}</div>
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
                <span style="font-weight: 800; font-size: 14px; margin-top: 6px; display: block;">Total Accumulated Score: ${truthScore.percentage}/100</span>
             </div>
          </div>
          ` : '<div class="waiting-lbl">Waiting for DePIN Truth Engine calculation...</div>'}
          
          <div style="margin-top: 40px; text-align: center; color: #BDBDBD; font-size: 11px; font-weight: 600; letter-spacing: 0.5px;">Powered by Zero-cost Local DePIN (Decentralized Physical Infrastructure Networks)</div>
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

  // Phase 10: Xác nhận Link Web Thương Hiệu (Vouch for Brand)
  const vouchForBrand = () => {
    if (!currentDomain) return;
    const newScore = brandSafetyScore + 10;
    
    // Cập nhật điểm an toàn của Domain lên mạng P2P
    gun.get('brand_safety').get(currentDomain).put({ score: newScore, last_verified: Date.now() });
    
    // Thưởng Bodhi Point cho thợ săn sự thật
    setBodhiPoints(prev => prev + 2);
    setMinedReward('+2 Pts (Brand Vouched)');
    setTimeout(() => setMinedReward(null), 3000);
  };

  const handleGo = () => {
    Keyboard.dismiss();
    let query = urlInput.trim();
    if (!query || query === 'truth://home') {
       setIsHome(true);
       setP2pContent(null);
       setCurrentUrl('');
       return;
    }

    setIsHome(false);
    setIsLoading(true);
    setP2pContent(null);
    setP2pData(null);
    setTruthScore(null);
    setEvidenceList([]); // Reset bằng chứng cũ
    setCurrentDomain(null);
    setBrandSafetyScore(0);

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
    
    // Phase 10: Tính toán Safety Score cho Domain
    const domain = query.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
    setCurrentDomain(domain);
    
    gun.get('brand_safety').get(domain).on((data) => {
      if (data && data.score) {
        setBrandSafetyScore(data.score);
      }
    });

    setCurrentUrl(query);
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* V-ID Trust Economy Wallet Bar */}
      <View style={styles.walletBar}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Ionicons name="shield-checkmark" size={16} color="#4A148C" style={{marginRight: 6}} />
          <Text style={styles.walletNodeId}>ANON_ID: {anonymousId}</Text>
        </View>
        <TouchableOpacity onPress={() => setIsLeaderboardVisible(true)}>
           <LinearGradient 
             colors={['#8E24AA', '#512DA8']} 
             start={{x: 0, y: 0}} end={{x: 1, y: 1}} 
             style={styles.walletPointsBox}
           >
             <Text style={styles.pointsText}>{bodhiPoints} Bodhi Pts</Text>
             <Ionicons name="trophy" size={14} color="#FFD54F" />
           </LinearGradient>
        </TouchableOpacity>
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
          placeholderTextColor="#BDBDBD"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleGo}
          returnKeyType="go"
        />
        <TouchableOpacity style={styles.goButton} onPress={handleGo}>
          {isLoading ? (
            <ActivityIndicator color="#8E24AA" />
          ) : (
            <Ionicons name="search" size={24} color="#8E24AA" />
          )}
        </TouchableOpacity>
      </View>

      {/* BTVE TRUTH METER (Lớp 3) */}
      {(isVerifying || truthScore || p2pData) && p2pContent && (
        <View style={styles.truthMeterContainer}>
          <LinearGradient colors={['#311B92', '#8E24AA']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.truthMeterHeader}>
            <Ionicons name="flower-outline" size={18} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.truthMeterTitle}>Budai Awakening Verification</Text>
          </LinearGradient>
          
          <View style={styles.truthMeterBody}>
            {isVerifying && !truthScore ? (
              <View style={styles.verifyingState}>
                <ActivityIndicator color="#8E24AA" size="small" />
                <Text style={styles.verifyingText}>Awakening Bodhi Nodes nearby...</Text>
              </View>
            ) : truthScore ? (
              <View style={styles.scoreState}>
                <LinearGradient 
                   colors={truthScore.percentage > 70 ? ['#E8F5E9', '#C8E6C9'] : ['#FFF3E0', '#FFE0B2']}
                   style={styles.scoreCircle}>
                  <Text style={[styles.scoreNumber, {color: truthScore.percentage > 70 ? '#2E7D32' : '#EF6C00'}]}>
                    {truthScore.percentage}%
                  </Text>
                  <Text style={styles.scoreLabel}>TRUTH SCORE</Text>
                </LinearGradient>
                <View style={styles.scoreDetails}>
                  <Text style={[styles.scoreStatus, {color: truthScore.percentage > 70 ? '#2E7D32' : '#E65100'}]}>
                    {truthScore.percentage > 70 ? 'TRUTH AWAKENED' : 'CLOUDS OF DOUBT'}
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="people" size={13} color="#8E24AA" /> Verified by {truthScore.peersAssisted} Bodhi Nodes
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="lock-closed" size={13} color="#8E24AA" /> WebCrypto Dharma Seals Valid
                  </Text>
                  <Text style={styles.scoreSubtext}>
                    <Ionicons name="location" size={13} color="#8E24AA" /> Proximate Reality Grounded
                  </Text>
                </View>
              </View>
            ) : (
               <View style={styles.verifyingState}>
                 <Text style={styles.verifyingText}>Chưa có Nút nào đóng góp Bằng chứng cho Vụ này.</Text>
               </View>
            )}

             {/* Hành động P2P */}
             <View style={styles.actionButtonsRow}>
               {/* Nút Đóng góp Bằng chứng P2P */}
               <TouchableOpacity onPress={submitEvidence} style={{flex: 1}}>
                  <LinearGradient colors={['#D81B60', '#C2185B']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.submitEvidenceBtn}>
                    <Ionicons name="add-circle" size={16} color="#fff" style={{marginRight: 6}}/>
                    <Text style={styles.submitEvidenceText}>Gửi Bằng Chứng</Text>
                  </LinearGradient>
               </TouchableOpacity>

               {/* Nút Kêu gọi Đồng minh (Viral / Share) */}
               {truthScore && truthScore.percentage < 100 && (
                  <TouchableOpacity onPress={callForBackup} style={{flex: 1, marginLeft: 10}}>
                     <LinearGradient colors={['#FF9800', '#F57C00']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.submitEvidenceBtn}>
                       <Ionicons name="share-social" size={16} color="#fff" style={{marginRight: 6}}/>
                       <Text style={styles.submitEvidenceText}>Gọi Nhân Chứng</Text>
                     </LinearGradient>
                  </TouchableOpacity>
               )}
             </View>

             {truthScore && truthScore.peersAssisted < 3 && (
               <Text style={styles.viralPrompt}>
                 <Ionicons name="alert-circle" size={12} color="#F57C00" /> Cần thêm {3 - truthScore.peersAssisted} Bodhi Nodes nữa để đạt Sự thật 100%. Hãy mời người xung quanh!
               </Text>
             )}

          </View>
        </View>
      )}

      {/* Phase 11: Discovery Home Feed (Màn hình chính cuốn hút user) */}
      {isHome ? (
        <ScrollView style={styles.homeFeedContainer} contentContainerStyle={{paddingBottom: 40}}>
           <Text style={styles.homeFeedTitle}>Trending Nhờ Xác Minh P2P</Text>
           <Text style={styles.homeFeedSubtitle}>Cộng đồng đang cần Bodhi Nodes tại các điểm nóng này.</Text>
           
           {homeFeedList.map(item => (
              <TouchableOpacity 
                 key={item.id} 
                 style={styles.feedCard}
                 onPress={() => {
                    setUrlInput(`truth://${item.path}`);
                    setTimeout(handleGo, 100);
                 }}
              >
                 <View style={{flex: 1}}>
                    <Text style={styles.feedCardTitle}>{item.title}</Text>
                    <View style={styles.feedCardMeta}>
                       <Ionicons name="people" size={12} color="#757575" style={{marginRight: 4}}/>
                       <Text style={styles.feedCardWitness}>{item.witnesses} Bodhi Nodes đang xem xét</Text>
                    </View>
                 </View>
                 <View style={styles.feedCardScoreBox}>
                    <Text style={[styles.feedCardScore, {color: item.score > 70 ? '#2E7D32' : (item.score > 40 ? '#F57C00' : '#D32F2F')}]}>
                      {item.score}%
                    </Text>
                    <Text style={styles.feedCardScoreLabel}>TRUST</Text>
                 </View>
              </TouchableOpacity>
           ))}
           
           <View style={styles.promoBanner}>
              <Ionicons name="diamond" size={24} color="#FFF" />
              <View style={{marginLeft: 12}}>
                 <Text style={styles.promoTitle}>Đào Bodhi Points mỗi ngày!</Text>
                 <Text style={styles.promoDesc}>Trở thành Nút Sự Thật, nộp bằng chứng trực tiếp tại các sự kiện nóng để săn thưởng.</Text>
              </View>
           </View>
        </ScrollView>
      ) : p2pContent ? (
        <WebView originWhitelist={['*']} source={{ html: p2pContent }} style={styles.webview} />
      ) : (
        <View style={{flex: 1}}>
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            style={styles.webview}
            onNavigationStateChange={(navState) => {
              if (navState.url !== currentUrl && navState.url.startsWith('http')) {
                setUrlInput(navState.url);
                const newDomain = navState.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
                if (newDomain !== currentDomain) {
                   setCurrentDomain(newDomain);
                   gun.get('brand_safety').get(newDomain).once((data) => {
                      setBrandSafetyScore(data ? data.score || 0 : 0);
                   });
                }
              }
            }}
          />
          
          {/* Brand Safety Shield (Phase 10) */}
          {currentDomain && (
            <View style={styles.brandShieldContainer}>
               <View style={styles.brandShieldInfo}>
                 <Ionicons name={brandSafetyScore > 20 ? "shield-checkmark" : "warning"} size={20} color={brandSafetyScore > 20 ? "#4CAF50" : "#F44336"} />
                 <View style={{marginLeft: 10, flex: 1}}>
                    <Text style={styles.brandDomainText}>{currentDomain}</Text>
                    <Text style={styles.brandSafetyText}>
                      {brandSafetyScore > 20 ? 'Thương hiệu An toàn (Cộng đồng xác thực)' : 'Tên miền chưa được kiểm chứng!'}
                    </Text>
                 </View>
               </View>
               
               <TouchableOpacity onPress={vouchForBrand} style={styles.vouchBtn}>
                  <Text style={styles.vouchBtnText}>Bảo Lãnh (+2 Bodhi)</Text>
               </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Phase 12: Gamified Leaderboard Modal */}
      <Modal visible={isLeaderboardVisible} animationType="slide" transparent={true}>
         <View style={styles.modalOverlay}>
            <View style={styles.leaderboardModal}>
               <View style={styles.leaderboardHeader}>
                 <Ionicons name="trophy" size={28} color="#FFD54F" />
                 <Text style={styles.leaderboardTitle}>Top Bodhi Nodes</Text>
                 <TouchableOpacity onPress={() => setIsLeaderboardVisible(false)} style={styles.closeModalBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                 </TouchableOpacity>
               </View>
               <ScrollView style={styles.leaderboardList}>
                  {/* Dòng xếp hạng của riêng người dùng */}
                  <View style={[styles.leaderboardRow, {backgroundColor: '#F3E5F5', borderColor: '#CE93D8', borderWidth: 1}]}>
                     <View style={styles.rankBadge}><Text style={styles.rankText}>?</Text></View>
                     <Text style={[styles.participantId, {color: '#4A148C'}]}>You (0x{anonymousId.substring(2)})</Text>
                     <Text style={[styles.participantPoints, {color: '#8E24AA'}]}>{bodhiPoints} Pts</Text>
                  </View>
                  <View style={{height: 1, backgroundColor: '#eee', marginVertical: 8}} />
                  
                  {leaderboardData.map((node, index) => (
                     <View key={index} style={styles.leaderboardRow}>
                        <View style={[styles.rankBadge, index === 0 ? {backgroundColor: '#FFD54F'} : index === 1 ? {backgroundColor: '#E0E0E0'} : index === 2 ? {backgroundColor: '#FFB300'} : {}]}>
                           <Text style={[styles.rankText, index < 3 ? {color: '#fff'} : {}]}>{node.rank}</Text>
                        </View>
                        <Text style={styles.participantId}>{node.id}</Text>
                        <Text style={styles.participantPoints}>{node.points} Pts</Text>
                     </View>
                  ))}
               </ScrollView>
            </View>
         </View>
      </Modal>

      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf9f6' }, // Màu nền xám kem sang trọng
  
  // Wallet Bar
  walletBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#f3e5f5',
    borderBottomWidth: 1, borderBottomColor: 'rgba(142,36,170,0.1)',
  },
  walletNodeId: { fontSize: 13, fontWeight: '800', color: '#4A148C', letterSpacing: 0.5 },
  walletPointsBox: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 20, shadowColor: '#4A148C', shadowOpacity: 0.2, shadowOffset: {width: 0, height: 2}, shadowRadius: 4, elevation: 3 
  },
  pointsText: { fontSize: 13, fontWeight: '900', color: '#FFF', marginRight: 6 },
  
  miningAlert: {
    padding: 10, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 110, alignSelf: 'center', zIndex: 10, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: {width: 0, height: 4}, shadowRadius: 8, elevation: 5, paddingHorizontal: 24
  },
  miningText: { fontSize: 14, fontWeight: '800' },

  header: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, 
    backgroundColor: '#fff', shadowColor: '#A1887F', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
    zIndex: 1, paddingBottom: 16
  },
  urlInput: {
    flex: 1, height: 48, backgroundColor: '#f5f5f5', borderRadius: 24, paddingHorizontal: 20, fontSize: 15, color: '#212121', borderWidth: 1, borderColor: '#eeeeee', fontWeight: '500'
  },
  goButton: { marginLeft: 14, justifyContent: 'center', alignItems: 'center', width: 44, height: 44, backgroundColor: '#f3e5f5', borderRadius: 22 },
  webview: { flex: 1, backgroundColor: '#faf9f6' },
  
  // Truth Meter Styles (Budai Theme)
  truthMeterContainer: {
    margin: 16, backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#311B92', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 8,
    borderWidth: 1, borderColor: 'rgba(142,36,170,0.1)', overflow: 'hidden'
  },
  truthMeterHeader: {
    paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center'
  },
  truthMeterTitle: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  truthMeterBody: { padding: 20 },
  verifyingState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  verifyingText: { marginLeft: 12, color: '#757575', fontSize: 14, fontWeight: '600' },
  scoreState: { flexDirection: 'row', alignItems: 'center' },
  scoreCircle: { 
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width: 0, height: 4}, shadowRadius: 8, elevation: 4
  },
  scoreNumber: { fontSize: 26, fontWeight: '900' },
  scoreLabel: { fontSize: 9, fontWeight: '800', color: '#757575', marginTop: 2, textTransform:'uppercase', letterSpacing:0.5 },
  scoreDetails: { marginLeft: 24, flex: 1 },
  scoreStatus: { fontSize: 18, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  scoreSubtext: { fontSize: 12, color: '#616161', marginBottom: 4, fontWeight: '500' },

  actionButtonsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, alignItems: 'center'
  },
  submitEvidenceBtn: {
    padding: 12, borderRadius: 12, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D81B60', shadowOpacity: 0.3, shadowOffset: {height: 4, width: 0}, shadowRadius: 8, elevation: 4
  },
  submitEvidenceText: {
    color: '#fff', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5
  },
  viralPrompt: {
    marginTop: 12, fontSize: 11, color: '#F57C00', fontWeight: '600', textAlign: 'center', backgroundColor: '#FFF3E0', paddingVertical: 6, borderRadius: 8, overflow: 'hidden'
  },
  
  // Brand Safety Shield
  brandShieldContainer: {
    position: 'absolute', bottom: 30, left: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: {height: 6, width: 0}, shadowRadius: 16, elevation: 8,
    borderWidth: 1, borderColor: '#eee'
  },
  brandShieldInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  brandDomainText: { fontSize: 13, fontWeight: '800', color: '#333' },
  brandSafetyText: { fontSize: 11, color: '#666', marginTop: 2 },
  vouchBtn: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#C8E6C9' },
  vouchBtnText: { color: '#2E7D32', fontWeight: '800', fontSize: 11 },
  
  // Phase 11: Home Feed Styles
  homeFeedContainer: { flex: 1, backgroundColor: '#faf9f6', padding: 16 },
  homeFeedTitle: { fontSize: 20, fontWeight: '900', color: '#4A148C', marginBottom: 4 },
  homeFeedSubtitle: { fontSize: 13, color: '#757575', marginBottom: 20, fontWeight: '500' },
  feedCard: { 
     backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, 
     flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
     shadowColor: '#4A148C', shadowOpacity: 0.06, shadowOffset: {width: 0, height: 6}, shadowRadius: 10, elevation: 3,
     borderWidth: 1, borderColor: '#f0f0f0'
  },
  feedCardTitle: { fontSize: 15, fontWeight: '700', color: '#212121', marginBottom: 8, lineHeight: 22 },
  feedCardMeta: { flexDirection: 'row', alignItems: 'center' },
  feedCardWitness: { fontSize: 12, color: '#757575', fontWeight: '500' },
  feedCardScoreBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', padding: 10, borderRadius: 12, marginLeft: 16, minWidth: 60 },
  feedCardScore: { fontSize: 15, fontWeight: '900' },
  feedCardScoreLabel: { fontSize: 9, fontWeight: '800', color: '#9E9E9E', marginTop: 2 },
  promoBanner: { 
     marginTop: 20, backgroundColor: '#8E24AA', borderRadius: 16, padding: 20, 
     flexDirection: 'row', alignItems: 'center',
     shadowColor: '#8E24AA', shadowOpacity: 0.3, shadowOffset: {height: 8, width: 0}, shadowRadius: 16, elevation: 6
  },
  promoTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  promoDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', lineHeight: 18, paddingRight: 20 },

  // Phase 12: Leaderboard Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  leaderboardModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '70%', paddingBottom: 40 },
  leaderboardHeader: { backgroundColor: '#4A148C', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, flexDirection: 'row', alignItems: 'center' },
  leaderboardTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginLeft: 12, flex: 1 },
  closeModalBtn: { padding: 4 },
  leaderboardList: { padding: 20 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fafafa', borderRadius: 12, marginBottom: 8 },
  rankBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eeeeee', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rankText: { fontSize: 14, fontWeight: '900', color: '#757575' },
  participantId: { flex: 1, fontSize: 15, fontWeight: '700', color: '#424242', fontFamily: 'monospace' },
  participantPoints: { fontSize: 16, fontWeight: '900', color: '#F57C00' }
});
