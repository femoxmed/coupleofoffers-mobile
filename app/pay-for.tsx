import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { Palette } from '../constants/Colors';
import { formatNaira } from '../constants/config';
import { checkoutService } from '../services/checkoutService';
import { useAuthStore } from '../store/useAuthStore';

export default function PayForScreen() {
  const p = useLocalSearchParams<{ offerId:string; slotId:string; partySize:string; amountKobo:string; email?:string; offerTitle?:string; venueName?:string; slotTime?:string; bookingMessage?:string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const [payeeName, setPayeeName] = useState('');
  const [payeeEmail, setPayeeEmail] = useState(p.email || '');
  const [phone, setPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if ((!user && !payeeName.trim()) || !payeeEmail.includes('@')) return Alert.alert('Guest details required', user ? 'Enter the guest’s email address.' : 'Enter the guest’s name and a valid email address.');
    if (!user && (!payerName.trim() || !payerEmail.includes('@'))) return Alert.alert('Your details required', 'Enter your name and email so the payment can be attributed to you.');
    setBusy(true);
    try {
      const result = await checkoutService.initBachsCheckout({ offerId:p.offerId, slotId:p.slotId, partySize:Number(p.partySize)||2, totalKobo:Number(p.amountKobo)||0, email:payeeEmail.trim(), payerEmail:user?.email || payerEmail.trim(), payerName:user?.name || payerName.trim(), payeeName:payeeName.trim(), beneficiaryPhone:phone.trim(), bookingMessage:p.bookingMessage, offerTitle:p.offerTitle, venueName:p.venueName, slotTime:p.slotTime });
      router.replace({ pathname:'/checkout', params:{ authUrl:result.authorizationUrl, reference:result.reference, offerId:p.offerId, slotId:p.slotId, partySize:p.partySize, amountKobo:p.amountKobo, email:payeeEmail, offerTitle:p.offerTitle, venueName:p.venueName, slotTime:p.slotTime } });
    } catch (e) { Alert.alert('Unable to continue', e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.content}>
    <TouchableOpacity onPress={() => router.back()} style={s.back}><ArrowLeft size={20} color={Palette.aubergine}/><Text style={s.backText}>Back to offer</Text></TouchableOpacity>
    <Text style={s.eyebrow}>A THOUGHTFUL PAYMENT</Text><Text style={s.title}>{user ? 'Make this experience happen for someone.' : 'Make this experience happen for someone.'}</Text>
    <View style={s.card}><Text style={s.offer}>{p.offerTitle || 'Experience'}</Text><Text style={s.muted}>{p.venueName || ''} · {formatNaira(Number(p.amountKobo)||0)}</Text>
      {!user && <><Text style={s.label}>Payee name</Text><TextInput value={payeeName} onChangeText={setPayeeName} placeholder="Recipient name" style={s.input}/></>}
      <Text style={s.label}>Guest email</Text><TextInput value={payeeEmail} onChangeText={setPayeeEmail} placeholder="guest@example.com" autoCapitalize="none" keyboardType="email-address" style={s.input}/>
      {!user && <><Text style={s.label}>Phone number (optional)</Text><TextInput value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" keyboardType="phone-pad" style={s.input}/></>}
      {!user && <><Text style={s.label}>Your name</Text><TextInput value={payerName} onChangeText={setPayerName} placeholder="Your full name" style={s.input}/><Text style={s.label}>Your email</Text><TextInput value={payerEmail} onChangeText={setPayerEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" style={s.input}/></>}
      <TouchableOpacity disabled={busy} onPress={submit} style={[s.button,busy&&{opacity:.6}]}><Text style={s.buttonText}>{busy?'Preparing checkout…':'Continue to checkout'}</Text></TouchableOpacity>
      <View style={s.secure}><Lock size={14} color={Palette.goldInk}/><Text style={s.muted}>Secure payment powered by Bachs</Text></View>
    </View>
  </ScrollView></KeyboardAvoidingView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:Palette.secondaryBg},content:{padding:24,paddingTop:60},back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:36},backText:{color:Palette.aubergine,fontWeight:'700'},eyebrow:{color:Palette.mulberry,fontWeight:'800',letterSpacing:1.5,fontSize:12},title:{fontSize:28,lineHeight:36,fontWeight:'800',color:Palette.aubergine,marginTop:12,marginBottom:28},card:{backgroundColor:Palette.porcelain,borderRadius:22,padding:22},offer:{fontSize:21,fontWeight:'800',color:Palette.aubergine},muted:{color:Palette.mutedText,marginTop:6},label:{color:Palette.aubergine,fontWeight:'700',marginTop:20,marginBottom:8},input:{borderWidth:1,borderColor:'#DCCFC8',borderRadius:12,padding:15,color:Palette.aubergine,backgroundColor:'#FFFCF8'},button:{marginTop:26,backgroundColor:Palette.mulberry,borderRadius:28,padding:17,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800',fontSize:16},secure:{flexDirection:'row',gap:7,justifyContent:'center',alignItems:'center',marginTop:18}});
