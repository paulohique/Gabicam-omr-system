export const options = { headerShown: false };
// Para gráficos, instale: npm install react-native-chart-kit
// ou: yarn add react-native-chart-kit

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Recomendo instalar: react-native-chart-kit
// npm install react-native-chart-kit
// ou
// yarn add react-native-chart-kit

const screenWidth = Dimensions.get('window').width;

// Tipos explícitos
interface Resultado {
  id: number;
  prova_id: number;
  nome_aluno: string;
  data_criacao: string;
  status: string;
  acertos: number;
  total_questoes: number;
  nota: number;
  nome_prova: string;
  media_geral: number;
  nome_usuario: string;
  respostas_detectadas?: string;
  gabarito?: string;
  gabarito_usado?: string;
}

interface Prova {
  prova_id: number;
  nome_prova: string;
  media_geral: number;
  nome_usuario: string;
}

export default function ResultadosScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [provas, setProvas] = useState<Prova[]>([]);
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null);

  useEffect(() => {
    buscarResultados();
  }, []);

  const buscarResultados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/provas/resultados');
      setResultados(response.data.resultados);
      // Agrupar provas únicas
      const provaIds: number[] = Array.from(new Set(response.data.resultados.map((r: Resultado) => r.prova_id)));
      const provasUnicas: Prova[] = provaIds.map((id: number) => {
        const prova = response.data.resultados.find((r: Resultado) => r.prova_id === id);
        return { prova_id: id, nome_prova: prova.nome_prova, media_geral: prova.media_geral, nome_usuario: prova.nome_usuario };
      });
      setProvas(provasUnicas);
    } catch (error) {
      setResultados([]);
      setProvas([]);
    }
    setLoading(false);
  };

  // Estatísticas para a prova selecionada
  const getStats = (provaId: number) => {
    const dados = resultados.filter(r => r.prova_id === provaId);
    if (dados.length === 0) return null;
    const notas = dados.map(d => d.nota);
    const acertos = dados.map(d => d.acertos);
    const totalQuestoes = dados[0].total_questoes || 0;
    const media = notas.reduce((a, b) => a + b, 0) / notas.length;
    const maior = Math.max(...notas);
    const menor = Math.min(...notas);
    const freqNotas: { [key: string]: number } = {};
    notas.forEach(n => { freqNotas[n] = (freqNotas[n] || 0) + 1; });
    
    // Calcular questões mais acertadas e moda
    const questoesAcertos: { [key: number]: number } = {};
    for (let i = 1; i <= totalQuestoes; i++) {
      questoesAcertos[i] = 0;
    }
    
    // Simular dados de questões acertadas (você pode ajustar conforme sua API)
    dados.forEach(d => {
      for (let i = 1; i <= d.acertos; i++) {
        questoesAcertos[i] = (questoesAcertos[i] || 0) + 1;
      }
    });
    
    const moda = Object.keys(freqNotas).reduce((a, b) => freqNotas[a] > freqNotas[b] ? a : b);
    
    return {
      alunos: dados.length,
      media,
      maior,
      menor,
      freqNotas,
      acertos,
      totalQuestoes,
      notas,
      dados,
      questoesAcertos,
      moda: parseFloat(moda)
    };
  };

  // Função para gerar PDF do relatório
  const gerarRelatorioPDF = async () => {
    if (!provaSelecionada) return;
    
    const stats = getStats(provaSelecionada.prova_id);
    if (!stats) {
      Alert.alert('Erro', 'Não há dados suficientes para gerar o relatório.');
      return;
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório de Resultados - ${provaSelecionada.nome_prova}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2F4FCD; padding-bottom: 15px; }
            .header h1 { color: #2F4FCD; margin: 0; }
            .section { margin: 20px 0; }
            .section h2 { color: #2F4FCD; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f7ff; color: #2F4FCD; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 15px 0; }
            .stat-box { text-align: center; padding: 15px; background: #f5f7ff; border-radius: 8px; }
            .stat-value { font-size: 24px; font-weight: bold; color: #2F4FCD; }
            .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
            .percentage { color: #28a745; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Resultados</h1>
            <h2>${provaSelecionada.nome_prova}</h2>
            <p>Criado por: ${provaSelecionada.nome_usuario}</p>
            <p>Data do relatório: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="section">
            <h2>Resumo Estatístico</h2>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-value">${stats.alunos}</div>
                <div class="stat-label">Total de Alunos</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.media.toFixed(1)}</div>
                <div class="stat-label">Média Geral</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.maior}</div>
                <div class="stat-label">Maior Nota</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">${stats.menor}</div>
                <div class="stat-label">Menor Nota</div>
              </div>
            </div>
            <p><strong>Moda:</strong> ${stats.moda} (nota mais frequente)</p>
          </div>

          <div class="section">
            <h2>Resultados Individuais</h2>
            <table>
              <thead>
                <tr>
                  <th>Nome do Aluno</th>
                  <th>Acertos</th>
                  <th>Total de Questões</th>
                  <th>Percentual</th>
                  <th>Nota Final</th>
                  <th>Gabarito do Aluno</th>
                  <th>Gabarito Correto</th>
                </tr>
              </thead>
              <tbody>
                ${stats.dados.map((resultado: Resultado, index: number) => {
                  const percentual = ((resultado.acertos / stats.totalQuestoes) * 100).toFixed(1);
                  
                  // Obter respostas detectadas do aluno
                  let gabaritoAluno = 'Não disponível';
                  try {
                    const respostasArray = resultado.respostas_detectadas ? JSON.parse(resultado.respostas_detectadas) : [];
                    gabaritoAluno = respostasArray.length > 0 ? respostasArray.join(', ') : 'Não detectado';
                  } catch (e) {
                    gabaritoAluno = 'Erro ao carregar';
                  }
                  
                  // Obter gabarito correto - priorizar o gabarito_usado da API (mais preciso)
                  let gabaritoCorreto = 'Não disponível';
                  try {
                    // Primeiro tenta o gabarito_usado (da API de correção)
                    if (resultado.gabarito_usado) {
                      const gabaritoUsadoArray = JSON.parse(resultado.gabarito_usado);
                      gabaritoCorreto = gabaritoUsadoArray.length > 0 ? gabaritoUsadoArray.join(', ') : 'Não definido';
                    } 
                    // Se não tiver, usa o gabarito da prova
                    else if (resultado.gabarito) {
                      const gabaritoArray = JSON.parse(resultado.gabarito);
                      gabaritoCorreto = gabaritoArray.length > 0 ? gabaritoArray.join(', ') : 'Não definido';
                    }
                  } catch (e) {
                    gabaritoCorreto = 'Erro ao carregar';
                  }
                  
                  return `
                    <tr>
                      <td>${resultado.nome_aluno}</td>
                      <td style="text-align: center">${resultado.acertos}</td>
                      <td style="text-align: center">${stats.totalQuestoes}</td>
                      <td style="text-align: center" class="percentage">${percentual}%</td>
                      <td style="text-align: center; font-weight: bold">${resultado.nota}</td>
                      <td style="font-size: 10px">${gabaritoAluno}</td>
                      <td style="font-size: 10px">${gabaritoCorreto}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Análise de Questões</h2>
            <table>
              <thead>
                <tr>
                  <th>Questão</th>
                  <th>Número de Acertos</th>
                  <th>Percentual de Acerto</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(stats.questoesAcertos).map(([questao, acertos]) => {
                  const percentual = ((acertos / stats.alunos) * 100).toFixed(1);
                  return `
                    <tr>
                      <td>Questão ${questao}</td>
                      <td style="text-align: center">${acertos}</td>
                      <td style="text-align: center" class="percentage">${percentual}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            <p>Relatório gerado pelo GabiCam em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Relatório - ${provaSelecionada.nome_prova}`,
        });
      } else {
        Alert.alert('Sucesso', 'PDF gerado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <LinearGradient
          colors={['#f8f9ff', '#ffffff']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F4FCD" />
            <Text style={styles.loadingText}>Carregando resultados...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!provaSelecionada) {
    return (
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={['rgba(47, 79, 205, 0.06)', 'rgba(47, 79, 205, 0.02)', 'transparent']}
          locations={[0, 0.4, 1]}
          style={styles.backgroundGradient}
        />
        
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.titleIconContainer}>
                <Feather name="bar-chart-2" size={28} color="#2F4FCD" />
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.title}>Resultados das Provas</Text>
                <Text style={styles.subtitle}>Selecione uma prova para ver os detalhes</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <FlatList
          data={provas}
          keyExtractor={item => item.prova_id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => setProvaSelecionada(item)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ffffff', '#f5f7ff']}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Feather name="file-text" size={24} color="#2F4FCD" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>{item.nome_prova}</Text>
                    <Text style={styles.cardSubtitle}>Toque para ver resultados</Text>
                  </View>
                  <View style={styles.cardArrowContainer}>
                    <Feather name="chevron-right" size={20} color="#2F4FCD" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // Estatísticas da prova selecionada
  const stats = getStats(provaSelecionada.prova_id);
  if (!stats) return (
    <View style={styles.centered}>
      <LinearGradient
        colors={['#f8f9ff', '#ffffff']}
        style={styles.loadingGradient}
      >
        <Text style={styles.noDataText}>Sem dados para esta prova.</Text>
      </LinearGradient>
    </View>
  );

  // Dados para gráficos
  const barData = {
    labels: stats.dados.map((d: Resultado) => d.nome_aluno.split(' ')[0]), // Apenas primeiro nome
    datasets: [{ data: stats.notas }],
  };
  
  const pieData = Object.keys(stats.freqNotas).map((nota, index) => ({
    name: `Nota ${nota}`,
    population: stats.freqNotas[nota],
    color: `hsl(${210 + (index * 30)}, 70%, ${60 + (index * 5)}%)`,
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(47, 79, 205, 0.06)', 'rgba(47, 79, 205, 0.02)', 'transparent']}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header com botão voltar e PDF */}
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity 
            style={styles.voltarButton} 
            onPress={() => setProvaSelecionada(null)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ffffff', '#f5f7ff']}
              style={styles.voltarGradient}
            >
              <View style={styles.voltarContent}>
                <View style={styles.voltarIconContainer}>
                  <Feather name="arrow-left" size={20} color="#2F4FCD" />
                </View>
                <Text style={styles.voltarText}>Voltar</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.pdfButton} 
            onPress={gerarRelatorioPDF}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2F4FCD', '#4A67D6']}
              style={styles.pdfGradient}
            >
              <View style={styles.pdfContent}>
                <View style={styles.pdfIconContainer}>
                  <Feather name="download" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.pdfText}>Gerar PDF</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Título da prova */}
        <View style={styles.provaHeaderContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.provaHeaderGradient}
          >
            <Text style={styles.provaTitle}>{provaSelecionada.nome_prova}</Text>
            <Text style={styles.provaAutor}>Criada por: {provaSelecionada.nome_usuario}</Text>
          </LinearGradient>
        </View>

        {/* Estatísticas gerais */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#ffffff', '#f5f7ff']}
            style={styles.statsGradient}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.alunos}</Text>
                <Text style={styles.statLabel}>Alunos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{provaSelecionada.media_geral !== undefined ? provaSelecionada.media_geral.toFixed(1) : '-'}</Text>
                <Text style={styles.statLabel}>Média geral</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.maior}</Text>
                <Text style={styles.statLabel}>Maior nota</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.menor}</Text>
                <Text style={styles.statLabel}>Menor nota</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Gráfico de barras */}
        <View style={styles.chartContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.chartGradient}
          >
            <Text style={styles.chartTitle}>Notas por Aluno</Text>
            <View style={styles.chartWrapper}>
              <BarChart
                data={barData}
                width={screenWidth - 64}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                fromZero
                showValuesOnTopOfBars
                style={styles.chart}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Gráfico de pizza */}
        <View style={styles.chartContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.chartGradient}
          >
            <Text style={styles.chartTitle}>Distribuição de Notas</Text>
            <View style={styles.chartWrapper}>
              <PieChart
                data={pieData}
                width={screenWidth - 64}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={styles.chart}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Lista de alunos */}
        <View style={styles.alunosContainer}>
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.alunosGradient}
          >
            <Text style={styles.alunosTitle}>Resultados Individuais</Text>
            {stats.dados.map((item: Resultado, index: number) => (
              <View key={item.id} style={styles.alunoCard}>
                <LinearGradient
                  colors={['#f8f9ff', '#ffffff']}
                  style={styles.alunoCardGradient}
                >
                  <View style={styles.alunoRow}>
                    <View style={styles.alunoInfo}>
                      <Text style={styles.alunoNome}>{item.nome_aluno}</Text>
                      <Text style={styles.alunoDetalhes}>
                        {item.acertos}/{stats.totalQuestoes} acertos
                      </Text>
                    </View>
                    <View style={styles.alunoNotaContainer}>
                      <Text style={styles.alunoNota}>{item.nota}</Text>
                      <Text style={styles.alunoNotaLabel}>nota</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#f8f9ff',
  color: (opacity = 1) => `rgba(47, 79, 205, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
  barPercentage: 0.7,
  decimalPlaces: 1,
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: 'rgba(47, 79, 205, 0.1)',
  },
  propsForLabels: {
    fontSize: 12,
  },
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9ff',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: { 
    flex: 1, 
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  headerContainer: {
    margin: 20,
    borderRadius: 20,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(47, 79, 205, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#2F4FCD',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  card: { 
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  cardGradient: {
    borderRadius: 16,
    padding: 18,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(47, 79, 205, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: { 
    fontSize: 16, 
    color: '#2F4FCD', 
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  cardArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(47, 79, 205, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voltarButton: { 
    borderRadius: 14,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    flex: 1,
    marginRight: 10,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    margin: 20,
    marginBottom: 10,
  },
  pdfButton: {
    borderRadius: 14,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    flex: 1,
    marginLeft: 10,
  },
  pdfGradient: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pdfContent: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pdfText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '600',
  },
  voltarGradient: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  voltarContent: {
    flexDirection: 'row', 
    alignItems: 'center',
  },
  voltarIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(47, 79, 205, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  voltarText: { 
    color: '#2F4FCD', 
    fontSize: 16, 
    fontWeight: '600',
  },
  provaHeaderContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 18,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  provaHeaderGradient: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  provaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2F4FCD',
    textAlign: 'center',
  },
  provaAutor: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 18,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  statsGradient: {
    borderRadius: 18,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2F4FCD',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 18,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  chartGradient: {
    borderRadius: 18,
    padding: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F4FCD',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  chart: {
    borderRadius: 12,
  },
  alunosContainer: {
    marginHorizontal: 20,
    borderRadius: 18,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  alunosGradient: {
    borderRadius: 18,
    padding: 20,
  },
  alunosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F4FCD',
    marginBottom: 16,
    textAlign: 'center',
  },
  alunoCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  alunoCardGradient: {
    borderRadius: 12,
    padding: 16,
  },
  alunoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  alunoInfo: {
    flex: 1,
  },
  alunoNome: { 
    fontSize: 16, 
    color: '#333',
    fontWeight: '600',
    marginBottom: 2,
  },
  alunoDetalhes: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  alunoNotaContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(47, 79, 205, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  alunoNota: { 
    fontSize: 18, 
    color: '#2F4FCD',
    fontWeight: '700',
  },
  alunoNotaLabel: {
    fontSize: 11,
    color: '#2F4FCD',
    fontWeight: '500',
    marginTop: 1,
  },
});