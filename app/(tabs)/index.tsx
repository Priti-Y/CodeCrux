import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

const MAX_ATTEMPTS = 7;
const screenWidth = Dimensions.get("window").width;
const boxSize = Math.min((screenWidth - 120) / 4, 65);
const STORAGE_KEY = "codecrux-daily-state";

function generateDailyNumber() {
  const today = new Date().toDateString();
  let seed = [...today].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let result = "";

  for (let i = 0; i < 4; i++) {
    const index = seed % digits.length;
    result += digits[index];
    digits.splice(index, 1);
    seed = Math.floor(seed / 2) + 7;
  }
  return result;
}

function evaluateGuess(guess, target) {
  let exact = 0;
  let misplaced = 0;
  const usedTarget = Array(4).fill(false);
  const usedGuess = Array(4).fill(false);

  for (let i = 0; i < 4; i++) {
    if (guess[i] === target[i]) {
      exact++;
      usedTarget[i] = true;
      usedGuess[i] = true;
    }
  }

  for (let i = 0; i < 4; i++) {
    if (usedGuess[i]) continue;
    for (let j = 0; j < 4; j++) {
      if (!usedTarget[j] && guess[i] === target[j]) {
        misplaced++;
        usedTarget[j] = true;
        break;
      }
    }
  }
  return { exact, misplaced };
}

export default function CodeCruxApp() {
  const [target, setTarget] = useState("");
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const init = async () => {
      const dailyTarget = generateDailyNumber();
      setTarget(dailyTarget);
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.target === dailyTarget) {
          setGuesses(parsed.guesses || []);
          setGameOver(parsed.gameOver || false);
          setWin(parsed.win || false);
          setShowSummary(parsed.showSummary || false);
        }
      }
    };
    init();
  }, []);

  const saveState = async (state) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const handleGuess = async () => {
    if (input.length !== 4 || new Set(input.split("")).size !== 4) return;

    const result = evaluateGuess(input, target);
    const newGuesses = [...guesses, { value: input, ...result }];
    const isWin = result.exact === 4;
    const isGameOver = isWin || newGuesses.length >= MAX_ATTEMPTS;

    setGuesses(newGuesses);
    setInput("");
    setWin(isWin);
    setGameOver(isGameOver);

    await saveState({
      target,
      guesses: newGuesses,
      gameOver: isGameOver,
      win: isWin,
      showSummary: false,
    });
  };

  const closePopup = async () => {
    setShowSummary(true);
    await saveState({ target, guesses, gameOver, win, showSummary: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      {win && <ConfettiCannon count={120} origin={{ x: 200, y: 0 }} />}

      <Text style={styles.title}>CodeCrux</Text>
      <Text style={styles.caption}>Crack the code. Trust the clues.</Text>

      <View style={styles.boardWrapper}>
        {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => {
          const guess = guesses[index];
          return (
            <View key={index} style={styles.row}>
              <View style={styles.boxRow}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={styles.box}>
                    <Text style={styles.boxText}>
                      {guess?.value?.[i] || ""}
                    </Text>
                  </View>
                ))}
              </View>
              {guess && (
                <View style={styles.resultRow}>
                  <Text style={styles.exact}>✓ {guess.exact}</Text>
                  <Text style={styles.misplaced}>↺ {guess.misplaced}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={(text) => setInput(text.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          editable={!(gameOver && showSummary)}
          placeholder="4 unique digits"
          placeholderTextColor="#666"
          style={styles.input}
        />
        <TouchableOpacity
          onPress={handleGuess}
          disabled={gameOver && showSummary}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Guess</Text>
        </TouchableOpacity>
      </View>

      {gameOver && !showSummary && (
        <View style={styles.popup}>
          <Text style={styles.popupTitle}>
            {win ? "🎉 You Won!" : "💀 Game Over"}
          </Text>
          {!win && <Text style={styles.popupText}>Number was: {target}</Text>}
          <TouchableOpacity onPress={closePopup} style={styles.button}>
            <Text style={styles.buttonText}>Check Tomorrow</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 8,
    paddingBottom: 80,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 46,
    fontWeight: "bold",
    textAlign: "center",
    width: "100%",
    marginBottom: 2,
  },
  caption: {
    color: "#888",
    textAlign: "center",
    marginBottom: 10,
    marginTop: 0,
    width: "100%",
    alignSelf: "center",
  },
  row: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  boxRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: boxSize * 0.9,
    height: boxSize * 0.9,
    borderWidth: 1,
    borderColor: "#444",
    marginHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  boxText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  resultRow: {
    position: "absolute",
    right: -70,
    top: "50%",
    transform: [{ translateY: -18 }],
    width: 60,
    alignItems: "flex-start",
  },
  exact: { color: "#4ade80", fontWeight: "bold" },
  misplaced: { color: "#facc15", fontWeight: "bold" },
  boardWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  inputBar: {
    flexDirection: "row",
    marginTop: 20,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  input: {
    width: boxSize * 0.9 * 4 + 40,
    height: boxSize * 0.9,
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  button: {
    width: boxSize * 1.8,
    height: boxSize * 0.9,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "bold", fontSize: 18 },
  popup: {
    position: "absolute",
    top: "35%",
    left: 30,
    right: 30,
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 20,
  },
  popupTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  popupText: { color: "#aaa", textAlign: "center", marginVertical: 10 },
});
