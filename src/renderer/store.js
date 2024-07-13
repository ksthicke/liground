import Vue from 'vue'
import Vuex from 'vuex'
import ffish from 'ffish'
import { Engine, engine } from './engine'
import allEngines from './store/engines'

import moveAudio from './assets/audio/Move.mp3'
import captureAudio from './assets/audio/Capture.mp3'

Vue.use(Vuex)

class TwoWayMap {
  constructor (map) {
    this.map = map
    this.reverseMap = {}
    this.keys = []
    for (const key in map) {
      const value = map[key]
      this.reverseMap[value] = key
      this.keys.concat(key)
    }
  }

  getAll () { return this.map }
  get (key) { return this.map[key] }
  revGet (key) { return this.reverseMap[key] }
}

/**
 * Calculate the value for current side to move.
 * @param {number} value CP or Mate value
 * @param {boolean} sideToMove Current side to move (true = white)
 */
function calcForSide (value, sideToMove) {
  return sideToMove ? value : -value
}

/**
 * Convert a CP value to a display string.
 * @param {number} cp CP value
 */
function cpToString (cp) {
  if (isNaN(cp)) {
    return ''
  }
  if (cp === 0) {
    return '0.00'
  }
  const normalizedEval = (cp / 100).toFixed(2)
  if (cp > 0) {
    return `+${normalizedEval}`
  } else {
    return normalizedEval
  }
}

/**
 * Make the three integers parts add up to 100.
 * @param {number[]} intPart integer part
 * @param {number[]} remainder remainder
 */
function addTo100(intPart, remainder) {
  let newIntPart = intPart.slice()
  let newRemainder = remainder.slice()
  while (newIntPart[0] + newIntPart[1] + newIntPart[2] < 100) {
    let ind = newRemainder.indexOf(Math.max(...newRemainder))
    newRemainder[ind] = 0
    newIntPart[ind] = newIntPart[ind] + 1
  }
  return newIntPart
}

/**
 * Check if an option value is valid and emit warnings if necessary.
 * @param {any[]} options Array of engine options
 * @param {string} name Name of option
 * @param {any} value Option value to check
 */
function checkOption (options, name, value) {
  const option = options.find(e => e.name === name)
  if (!option) {
    console.warn(`[Engine] Unknown option "${name}"`)
  } else {
    switch (option.type) {
      case 'check':
        if (typeof value !== 'boolean') {
          console.warn(`[Engine] Invalid value type "${value}" for check option "${name}"`)
        }
        break
      case 'spin':
        if (typeof value !== 'number') {
          console.warn(`[Engine] Invalid value "${value}" for spin option "${name}"`)
        } else if (typeof option.max === 'number' && value > option.max) {
          console.warn(`[Engine] Out of range value "${value}" for spin option "${name}" (range ${option.min} to ${option.max})`)
        } else if (typeof option.min === 'number' && value < option.min) {
          console.warn(`[Engine] Out of range value "${value}" for spin option "${name}" (range ${option.min} to ${option.max})`)
        }
        break
      case 'combo':
        if (typeof value !== 'string') {
          console.warn(`[Engine] Invalid value "${value}" for combo option "${name}"`)
        } else if (Array.isArray(option.var) && !option.var.includes(value)) {
          console.warn(`[Engine] Unknown value "${value}" for combo option "${name}" (values ${option.var.map(e => `"${e}"`).join(', ')})`)
        }
        break
      case 'button':
        if (value !== undefined && value !== null) {
          console.warn(`[Engine] Unexpected value "${value}" for button option "${name}"`)
        }
        break
      case 'string':
        if (typeof value !== 'string') {
          console.warn(`[Engine] Invalid value "${value}" for string option "${name}"`)
        }
        break
    }
  }
}

function emptyAnalysisEngine () {
  const newEngine = {
    engine: new Engine(),
    engineInfo: {
      name: '',
      author: '',
      options: []
    },
    engineSettings: {},
    engineStats: {
      depth: 0,
      seldepth: 0,
      nodes: 0,
      nps: 0,
      hashfull: 0,
      tbhits: 0,
      time: 0
    },
    multipv: [
      {
        cp: 0,
        pv: "",
        ucimove: ""
      }
    ],
    clock: null,
    enginetime: 0,
    active: false,
    activeEngine: null
  }
  return newEngine
}

const filteredSettings = ['UCI_Variant', 'UCI_Chess960']

export const store = new Vuex.Store({
  state: {
    /**
     * analysisEngines: The engines currently being used for analysis, along with all their properties.
     * Each entry in the array has the following structure:
     * {
     *  engine,               // the Engine object for this analysis engine
     *  engineInfo:           // information that the engine outputs about itself
     *  {
     *    name,               // name of engine (e.g., Stockfish 12)
     *    author,             // authors of engine
     *    options
     *  },
     *  engineSettings: {},
     *  engineStats:          // current statistics output by the engine
     *  {
     *    depth,
     *    seldepth,
     *    nodes,
     *    nps,
     *    hashfull,
     *    tbhits,
     *    time
     *  },
     *  multipv:              // array that, for each line, holds the current 
     *                        // information about the calculated line
     *  [{
     *    cp,                 // centipawn evaluation
     *    pv,                 // principle variation
     *    ucimove,            // uci format of next move (e.g., e2e4)
     *    wdl                 // win/draw/loss per thousand
     *  }],
     *  clock: null,          // holds ID for the timer to compute enginetime
     *  enginetime: <Number>, // used for displaying the time from clock since 
     *                        // engineStats.time is not always updated every second
     *  active: <Boolean>,    // whether or not the engine is currently turned on
     *  activeEngine          // name that code uses (e.g., in engines.js) to identify engine
     * }
     */
    analysisEngines: [emptyAnalysisEngine()],
    // Engine specific:
    engineInfo: {
      name: '',
      author: '',
      options: []
    },
    engineSettings: {},
    engineStats: {
      depth: 0,
      seldepth: 0,
      nodes: 0,
      nps: 0,
      hashfull: 0,
      tbhits: 0,
      time: 0
    },
    enginetime: 0,
    clock: null,
    multipv: [
      {
        cp: 0,
        pv: '',
        ucimove: ''
      }
    ],
    active: false,
    activeEngine: null,

    // Not engine specific:
    initialized: false, // whether or not the board has been initialized
    PvE: false,
    PvEParam: 'go movetime 1000',
    PvEValue: 'time',
    PvEInput: 1000,
    resized: 0,
    resized9x9height: 0,
    resized9x9width: 0,
    resized9x10height: 0,
    resized9x10width: 0,
    dimNumber: 0,
    turn: true, // whether or not it is the human player's turn
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // to track the end of the current line
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: [],
    firstMoves: [],
    mainFirstMove: null,
    legalMoves: '',
    destinations: {},
    variant: 'chess',
    variantOptions: new TwoWayMap({ // all the currently supported options are listed here, variantOptions.get returns the right side, variantOptions.revGet returns the left side of the dict
      Standard: 'chess',
      Crazyhouse: 'crazyhouse',
      'King of the Hill': 'kingofthehill',
      '️Three-Check': '3check',
      Antichess: 'antichess',
      Atomic: 'atomic',
      Horde: 'horde',
      'Racing Kings': 'racingkings',
      Makruk: 'makruk',
      Shogi: 'shogi',
      Janggi: 'janggi',
      Xiangqi: 'xiangqi',
      Fischerandom: 'fischerandom'
    }),
    openedPGN: false,
    QuickTourIndex: 0,
    evalPlotDepth: 20,
    orientation: 'white',
    message: 'hello from Vuex',
    allEngines: allEngines, // array of all engines installed
    selectedEngines: {}, // engine user has most recently selected for each variant
    hoveredpv: -1,
    counter: 0,
    pieceStyle: 'cburnett',
    board: null,
    gameInfo: {},
    loadedGames: [],
    rounds: null,
    selectedGame: null,
    boardStyle: 'blue',
    curVar960Fen: '',
    viewAnalysis: true,
    analysisMode: true,
    menuAtMove: null,
    displayMenu: true,
    darkMode: false,
    muteButton: false,
    fenply: 1,
    internationalVariants: [
      '+ Add Custom', 'chess', 'crazyhouse', 'horde', 'kingofthehill', '3check', 'racingkings', 'antichess', 'atomic'
    ],
    seaVariants: [
      '+ Add Custom', 'makruk'
    ],
    xiangqiVariants: [
      '+ Add Custom', 'xiangqi'
    ],
    janggiVariants: [
      '+ Add Custom', 'janggi'
    ],
    shogiVariants: [
      '+ Add Custom', 'shogi'
    ],
  },
  mutations: { // sync
    curVar960Fen (state, payload) {
      state.curVar960Fen = payload
    },
    viewAnalysis (state, payload) {
      state.viewAnalysis = payload
    },
    fen (state, payload) {
      state.fen = payload
    },
    startFen (state, payload) {
      state.startFen = payload
    },
    lastFen (state, payload) {
      state.lastFen = payload
    },
    turn (state, payload) {
      state.turn = payload
    },
    mainFirstMove (state, payload) {
      state.mainFirstMove = payload
    },
    firstMoves (state, payload) {
      state.firstMoves.push(payload)
    },
    deleteFromFirstMoves (state, payload) {
      state.firstMoves.splice(state.firstMoves.indexOf(payload), 1)
    },
    deleteFromMoves (state, payload) {
      for (const index in payload.next) {
        this.commit('deleteFromMoves', payload.next[index])
      }
      state.moves.splice(state.moves.indexOf(payload), 1)
    },
    legalMoves (state, payload) {
      state.legalMoves = payload
    },
    initialized (state, payload) {
      state.initialized = payload
    },
    orientation (state, payload) {
      state.orientation = payload
    },
    PvE (state, payload) {
      state.PvE = payload
    },
    PvEParam (state, payload) {
      state.PvEParam = payload
    },
    PvEValue (state, payload) {
      state.PvEValue = payload
    },
    PvEInput (state, payload) {
      state.PvEInput = payload
    },
    quicktourIndexIncr (state) {
      state.QuickTourIndex++
    },
    quicktourIndexDecr (state) {
      state.QuickTourIndex--
    },
    quicktourSetZero (state) {
      state.QuickTourIndex = 0
    },
    dimNumber (state, payload) {
      state.dimNumber = payload
    },
    resized (state, payload) {
      state.resized = payload
    },
    resized9x9width (state, payload) {
      state.resized9x9width = payload
    },
    resized9x9height (state, payload) {
      state.resized9x9height = payload
    },
    resized9x10width (state, payload) {
      state.resized9x10width = payload
    },
    resized9x10height (state, payload) {
      state.resized9x10height = payload
    },
    active (state, payload) {
      state.active = payload
    },
    active_new (state, payload) {
      const { active, engineID } = payload
      state.analysisEngines[engineID-1].active = active
    },
    activeEngine (state, payload) {
      const {activeEngine, engineID } = payload
      state.analysisEngines[engineID-1].activeEngine = activeEngine
    },
    destinations (state, payload) {
      state.destinations = payload
    },
    variant (state, payload) {
      if (payload === 'racingkings') {
        state.orientation = 'white'
      }
      state.variant = payload
    },
    selectedEngines (state, payload) {
      state.selectedEngines = payload
    },
    clearIO (payload) {
      // dummy to trigger update in console
    },
    engineInfo (state, payload) {
      const { engineInfo, engineID } = payload
      state.analysisEngines[engineID-1].engineInfo = engineInfo
    },
    engineSettings (state, payload) {
      const { engineID, settings } = payload
      state.analysisEngines[engineID-1].engineSettings = settings
    },
    setEngineInfo (state, payload) {
      const { engineID, engineInfo } = payload
      state.analysisEngines[engineID-1].engineInfo = engineInfo
    },
    engineStats (state, payload) {
      const { stats, engineID } = payload
      state.analysisEngines[engineID-1].engineStats = stats
    },
    resetEngineStats (state, payload) {
      const engineID = payload
      state.analysisEngines[engineID-1].enginetime = 0
      state.analysisEngines[engineID-1].engineStats = {
        depth: 0,
        seldepth: 0,
        nodes: 0,
        nps: 0,
        hashfull: 0,
        tbhits: 0,
        time: 0
      }
    },
    multipv (state, payload) {
      const { lines, engineID } = payload
      for (const pvline of lines) {
        if (pvline) {
          if (pvline.cp || pvline.mate) {
            pvline.cpDisplay = typeof pvline.mate === 'number' ? `#${calcForSide(pvline.mate, state.turn)}` : cpToString(calcForSide(pvline.cp, state.turn))
          }
          if (pvline.wdl) {
            const intpart = pvline.wdl.map((e) => Math.floor(e/10))
            const remainder = pvline.wdl.map((e) => e % 10)
            const percentages = addTo100(intpart, remainder)
            pvline.wdlDisplay = "W:" + percentages[0] + "% D:" + percentages[1] + "% L:" + percentages[2] + "%"
          }
        }
      }
      state.analysisEngines[engineID-1].multipv = lines
    },
    setEngineOption (state, payload) {
      const { engineID, name, value } = payload
      Vue.set(state.analysisEngines[engineID-1].engineSettings, name, value)
    },
    addAnalysisEngine (state) {
      const newEngine = emptyAnalysisEngine()
      state.analysisEngines.push(newEngine)
    },
    removeAnalysisEngine (state) {
      state.analysisEngines.pop()
    },
    hoveredpv (state, payload) {
      state.hoveredpv = payload
    },
    increment (state, payload) {
      state.counter += payload
    },
    resetMultiPV (state, payload) {
      const engineID = payload
      state.analysisEngines[engineID-1].multipv = [
        {
          cp: 0,
          pv: '',
          ucimove: ''
        }
      ]
    },
    pieceStyle (state, payload) {
      state.pieceStyle = payload
    },
    boardStyle (state, payload) {
      state.boardStyle = payload
    },
    newBoard (state, payload) {
      const { fen, is960 } = payload || {}
      if (typeof fen === 'string') {
        if (is960) {
          state.board = new ffish.Board(state.variant, fen, true)
        } else {
          state.board = new ffish.Board(state.variant, fen)
        }
      } else {
        if (is960) {
          state.board = new ffish.Board(state.variant, state.curVar960Fen, true)
        } else {
          state.board = new ffish.Board(state.variant)
        }
      }
      state.moves = []
      state.mainFirstMove = null
      state.firstMoves = []
      state.gameInfo = {}
      state.fen = state.board.fen()
      state.turn = state.board.turn()
      state.legalMoves = state.board.legalMoves()
      state.lastFen = state.board.fen()
      state.startFen = state.board.fen()
      state.selectedGame = null
      state.fenply = 1
      this.commit('resetEngineStats', 1)
    },
    resetBoard (state, payload) {
      if (!payload.is960) {
        state.curVar960Fen = ''
      }
      this.commit('newBoard', payload)
      state.selectedGame = null
      state.moves = []
    },
    appendMoves (state, payload) {
      const mov = payload.move.split(' ')
      const prev = payload.prev
      let ply
      if (prev) {
        ply = prev.ply + 1
      } else { // then its a starting move
        if (state.turn) {
          ply = state.fenply
        } else {
          ply = state.fenply + 1
        }
      }
      let alreadyInMoves = false
      for (const num in state.moves) {
        if (state.moves[num].uci === mov[0] && state.moves[num].prev === prev) {
          alreadyInMoves = state.moves[num] // if the move is already in the history its stored here
        }
      }
      if (!alreadyInMoves) {
        state.moves = state.moves.concat(mov.map((curVal, idx, arr) => {
          const sanMove = state.board.sanMove(curVal)
          state.board.push(curVal)
          this.commit('playAudio', sanMove)
          return { ply: ply, name: sanMove, fen: state.board.fen(), uci: curVal, whitePocket: state.board.pocket(true), blackPocket: state.board.pocket(false), main: undefined, next: [], prev: prev }
        }))
        if (payload.prev) { // if the move is not a starting move
          prev.next.push(state.moves[state.moves.length - 1]) // the last entry in moves is the move object of the current move
          if (!prev.main) { // if there is no mainline yet, then this move is the main line now
            prev.main = state.moves[state.moves.length - 1]
          }
        } else { // then the currently added move was a starting move
          this.commit('firstMoves', state.moves[state.moves.length - 1]) // then we add it to the firstMoves array
          if (state.moves.length === 1) {
            this.commit('mainFirstMove', state.moves[0]) // then this is our mainFirstMove
          }
        }
      } else {
        state.board.push(alreadyInMoves.uci)
      }
      state.lastFen = state.board.fen()
    },
    playAudio (state, move) { // Sounds from lichess https://github.com/ornicar/lila
      if (state.openedPGN) {
        return
      }
      if (!state.muteButton) {
        let note = new Audio(moveAudio)
        if (move.toString().includes('x')) {
          note = new Audio(captureAudio)
        }
        note.play()
      }
    },
    gameInfo (state, payload) {
      state.gameInfo = payload
    },
    loadedGames (state, payload) {
      state.loadedGames = payload
      state.selectedGame = null
    },
    rounds (state, payload) {
      state.rounds = payload
    },
    selectedGame (state, payload) {
      state.selectedGame = payload
    },
    analysisMode (state, payload) {
      state.analysisMode = payload
    },
    openedPGN (state, payload) {
      state.openedPGN = payload
    },
    menuAtMove (state, payload) {
      state.menuAtMove = payload
    },
    displayMenu (state, payload) {
      state.displayMenu = payload
    },
    setDarkMode (state, payload) {
      state.darkMode = payload
    },
    switchMuteButton (state) {
      state.muteButton = !state.muteButton
    },
    evalPlotDepth (state, payload) {
      state.evalPlotDepth = payload
    },
    fenply (state, payload) {
      state.fenply = payload
    },
    movesChangeDummy (state, payload) {
      state.moves = []
      state.moves = payload
    },
    setEngineClock (state, payload) {
      const engineID = payload
      state.analysisEngines[engineID-1].clock = setInterval(function () { state.analysisEngines[engineID-1].enginetime = state.analysisEngines[engineID-1].enginetime + 1000 }, 1000)
    },
    resetEngineTime (state, payload) {
      const engineID = payload
      clearInterval(state.analysisEngines[engineID-1].clock)
    },
    saveSettings (state) {
      localStorage.darkMode = state.darkMode
      localStorage.muteButton = state.muteButton
      localStorage.evalPlotDepth = state.evalPlotDepth
      localStorage.variant = state.variant
      localStorage.resized = state.resized
      localStorage.resized9x9width = state.resized9x9width
      localStorage.resized9x9height = state.resized9x9height
      localStorage.resized9x10width = state.resized9x10width
      localStorage.resized9x10height = state.resized9x10height
      localStorage.dimNumber = state.dimNumber
    }
  },
  actions: { // async
    movesChangeDummy (context, payload) {
      context.commit('movesChangeDummy', payload)
    },
    playAudio (context, payload) {
      context.commit('playAudio', payload)
    },
    curVar960Fen (context, payload) {
      context.commit('curVar960Fen', payload)
    },
    resetBoard (context, payload) {
      context.commit('resetMultiPV', 1)
      context.commit('resetBoard', payload)
      context.dispatch('setEngineOptions', { UCI_Chess960: payload.is960, engineID: 1 })
      context.dispatch('restartAllEngines')
    },
    initializeStore (context) {
      if (localStorage.engines) {
        try {
          context.state.allEngines = JSON.parse(localStorage.engines)
        } catch (err) {
          localStorage.removeItem('engines')
        }
      }
      if (localStorage.internationalPieceStyle) {
        context.commit('pieceStyle', localStorage.internationalPieceStyle)
      }
      if (localStorage.internationalBoardStyle) {
        context.commit('boardStyle', localStorage.internationalBoardStyle)
      }
      if (localStorage.variant) {
        context.commit('variant', localStorage.variant)
      }
      if (localStorage.muteButton) {
        if (localStorage.muteButton === 'true') {
          context.commit('switchMuteButton')
        }
      }
      if (localStorage.darkMode) {
        if (localStorage.darkMode === 'true') {
          context.commit('setDarkMode', true)
        }
      }
      if (localStorage.evalPlotDepth) {
        context.state.evalPlotDepth = localStorage.evalPlotDepth
      }
    },
    initializeBoard (context) {
      context.commit('newBoard')
      context.dispatch('updateBoard')
      context.dispatch('changeEngine', { engineName: context.getters.availableEngines[0].name, engineID: 1 })
      context.commit('initialized', true)
    },
    updateBoard (context) {
      const { board } = context.state
      board.setFen(context.state.fen)
      context.commit('turn', board.turn())
      context.commit('legalMoves', board.legalMoves())
    },
    push (context, payload) {
      context.commit('appendMoves', payload)
      context.dispatch('fen', context.state.board.fen())
    },
    pushMainLine (context, payload) {
      let prev = payload.prev
      for (const i in payload.line) {
        context.commit('appendMoves', { move: payload.line[i], prev: prev })
        const move = context.getters.getMoveByUCIAndPrev(payload.line[i], prev)[0]
        if (!prev) {
          context.commit('mainFirstMove', move)
          prev = move
        } else {
          prev.main = move
          prev = prev.main
        }
      }
      context.dispatch('fen', context.state.board.fen())
    },
    pushAltLine (context, payload) {
      let prev = payload.prev
      for (const i in payload.line) {
        context.commit('appendMoves', { move: payload.line[i], prev: prev })
        const move = context.getters.getMoveByUCIAndPrev(payload.line[i], prev)[0]
        if (!prev) {
          if (!context.state.mainFirstMove) {
            context.commit('mainFirstMove', move)
          }
        }
        prev = move
      }
      context.dispatch('fen', context.state.board.fen())
    },
    mainFirstMove (context, payload) {
      if (context.state.mainFirstMove !== payload) {
        context.commit('mainFirstMove', payload)
      }
    },
    firstMoves (context, payload) {
      if (!context.state.firstMoves.includes(payload)) {
        context.commit('firstMoves', payload)
      }
    },
    deleteFromMoves (context, payload) {
      if (!payload.prev) {
        context.commit('deleteFromFirstMoves', payload)
      }
      context.commit('deleteFromMoves', payload)
    },
    resetEngineData (context, payload) {
      const engineID = payload
      context.commit('resetEngineTime', engineID)
      context.commit('resetMultiPV', engineID)
      context.commit('resetEngineStats', engineID)
    },
    resetAllEngines (context) {
      for ( let i = 1; i <= context.getters.numberOfAnalysisEngines; i++) {
        context.dispatch('resetEngine', i)
      }
    },
    resetEngine (context, payload) {
      const engineID = payload
      context.dispatch('stopEngine', engineID)
      context.dispatch('resetEngineData', engineID)
      console.log('active', engineID, context.getters.active_new(engineID))
      context.commit('clearIO', engineID)
    },
    setPvEParam (context, payload) {
      context.commit('PvEParam', payload)
    },
    setPvEValue (context, payload) {
      context.commit('PvEValue', payload)
    },
    setPvEInput (context, payload) {
      context.commit('PvEInput', payload)
    },
    setDimNumber (context, payload) {
      context.commit('dimNumber', payload)
    },
    setResized (context, payload) {
      context.commit('resized', payload)
    },
    setResized9x9width (context, payload) {
      context.commit('resized9x9width', payload)
    },
    setResized9x9height (context, payload) {
      context.commit('resized9x9height', payload)
    },
    setResized9x10width (context, payload) {
      context.commit('resized9x10width', payload)
    },
    setResized9x10height (context, payload) {
      context.commit('resized9x10height', payload)
    },
    defaultSettings (context, payload) {
      const { engineInfo, engineID } = payload
      // put the default values of the engine into engineSettings
      const settings = {}
      for (const option of engineInfo.options) {
        if (!filteredSettings.includes(option.name)) {
          switch (option.type) {
            case 'check':
              settings[option.name] = option.default === 'true'
              break
            case 'spin':
            case 'combo':
              settings[option.name] = option.default
              break
            case 'string':
              settings[option.name] = option.default || ''
              break
          }
        }
      }
      context.commit('engineSettings', { engineID, settings })
    },
    goEngine (context, payload) {
      const engineID = payload
      const engine = context.getters.computeEngine(engineID)
      engine.send('go infinite')
      context.commit('setEngineClock', engineID)
      context.commit('active_new', { active: true, engineID })
    },
    goEnginePvE (context) {
      const engine = context.getters.computeEngine(1)
      engine.send(context.getters.PvEParam)
      context.commit('setEngineClock', 1)
    },
    PvEMakeMove (context, payload) {
      const state = context.state
      if (context.getters.active_new(1) && state.PvE && !state.turn) {
        context.dispatch('push', { move: payload, prev: context.getters.currentMove[0] })
      }
    },
    PvEtrue (context) {
      context.commit('PvE', true)
    },
    stopEnginePvE (context) {
      const engine = context.getters.computeEngine(1)
      engine.send('stop')
    },
    PvEfalse (context) {
      context.commit('PvE', false)
      if (!context.getters.turn) {
        context.dispatch('stopEngine', 1)
      } else {
        context.commit('resetEngineTime', 1)
        context.commit('active_new', { active: false, engineID: 1 })
      }
      context.dispatch('resetEngineData', 1)
    },
    stopEngine (context, payload) {
      const engineID = payload
      const engine = context.getters.computeEngine(engineID)
      engine.send('stop')
      context.commit('resetEngineTime', engineID)
      context.commit('active_new', { active: false, engineID })
    },
    startEngine (context, payload) {
      const engineID = payload
    },
    restartAllEngines (context) {
      for (let i = 1; i <= context.getters.numberOfAnalysisEngines; i++) {
        context.dispatch('restartEngine', i)
      }
    },
    restartEngine (context, payload) {
      const engineID = payload
      context.dispatch('resetEngineData', engineID)
      if (engineID == 1 && context.getters.active_new(engineID) && context.getters.PvE && !context.getters.turn) {
        context.dispatch('position', engineID)
        context.dispatch('goEnginePvE')
      } else if (context.getters.active_new(engineID) && !context.getters.PvE) {
        context.dispatch('stopEngine', engineID)
        context.dispatch('position', engineID)
        context.dispatch('goEngine', engineID)
      }
    },
    position (context, payload) {
      const engineID = payload
      const engine = context.getters.computeEngine(engineID)
      engine.send(`position fen ${context.getters.fen}`)
      const eve = new CustomEvent('position', { detail: { fen: context.getters.fen } })
      document.dispatchEvent(eve)
    },
    fen (context, payload) {
      if (context.state.fen !== payload) {
        context.commit('fen', payload)
        context.dispatch('updateBoard')
        context.dispatch('restartAllEngines')
      }
    },
    fenField (context, payload) {
      if (ffish.validateFen(payload, context.getters.variant) === 1) { // this doesnt work properly for horde and racing kings
        if (context.state.fen !== payload) {
          context.commit('fen', payload)
          context.dispatch('updateBoard')
          context.dispatch('restartAllEngines')
          context.commit('newBoard', { fen: payload })
          let index = 1
          while (payload[payload.length - index] !== ' ') {
            index = index + 1
          }
          const numAsString = payload.substring(payload.length - index, payload.length)
          const ply = parseInt(numAsString)
          context.commit('fenply', 2 * ply - 1)
        }
      } else {
        alert('Please insert a valid FEN for the current variant')
      }
    },
    lastFen (context, payload) {
      context.commit('lastFen', payload)
    },
    startFen (context, payload) {
      context.commit('startFen', payload)
    },
    destinations (context, payload) {
      context.commit('destinations', payload)
    },
    orientation (context, payload) {
      context.commit('orientation', payload)
    },
    active (context, payload) {
      context.commit('active', payload)
    },
    active_new (context, payload) {
      const { active, engineID } = payload
      // Only do something if the active state is changing
      if (active != context.getters.active_new(engineID)) {
        if (active) { // If turning on
          context.dispatch('position', engineID)
          context.dispatch('goEngine', engineID)
        } else { // If turning off
          context.dispatch('stopEngine', engineID)
        }
        context.commit('active_new', payload)
      }
    },
    PvE (context, payload) {
      context.commit('PvE', payload)
    },
    PvEParam (context, payload) {
      context.commit('PvEParam', payload)
    },
    PvEValue (context, payload) {
      context.commit('PvEValue', payload)
    },
    PvEInput (context, payload) {
      context.commit('PvEInput', payload)
    },
    dimNumber (context, payload) {
      context.commit('dimNumber', payload)
    },
    resized (context, payload) {
      context.commit('resized', payload)
    },
    resized9x9width (context, payload) {
      context.commit('resized9x9width', payload)
    },
    resized9x9height (context, payload) {
      context.commit('resized9x9height', payload)
    },
    resized9x10width (context, payload) {
      context.commit('resized9x10width', payload)
    },
    resized9x10height (context, payload) {
      context.commit('resized9x10height', payload)
    },
    variant (context, payload) {
      if (context.getters.variant !== payload) {
        // remove all engines, except the first one
        context.dispatch('removeAllEngines')

        // prepare engine
        if (context.getters.active_new(1)) {
          context.dispatch('stopEngine', 1)
        }
        context.dispatch('resetEngineData', 1)
        const oldEngine = context.getters.selectedEngine(1)

        // update variant
        context.commit('variant', payload)
        const variants = ['chess', 'crazyhouse', 'racingkings', '3check', 'antichess', 'atomic']
        if (variants.includes(payload)) {
          const varFen = context.getters.curVar960Fen
          const is960Mode = varFen !== ''
          context.commit('newBoard', { is960: is960Mode, fen: varFen })
        } else {
          context.commit('newBoard', { is960: false, fen: '' })
        }

        // switch to new engine
        const last = context.state.selectedEngines[payload]
        const newEngine = typeof last === 'string'
          ? last
          : (oldEngine && oldEngine.variants.includes(payload) ? oldEngine.name : context.getters.availableEngines[0].name)
        context.dispatch('changeEngine', { engineName: newEngine, engineID: 1 }).then(() => {
          context.dispatch('setEngineOptions', { UCI_Variant: payload, engineID: 1 })
        })
      }
    },
    set960 (context, payload) {
      context.commit('selectedGame', null)
      context.commit('resetMultiPV', 1)
      context.commit('newBoard', {
        fen: payload.fen,
        is960: payload.is960
      })
      context.dispatch('setEngineOptions', { UCI_Chess960: payload.is960, engineID: 1 })
    },
    async addEngine (context, payload) {
      // discover the variants by running the engine
      const { name, binary, cwd, logo } = payload
      const info = await engine.run(binary, cwd)
      const variantOption = info.options.find(option => option.name === 'UCI_Variant')
      const variants = variantOption ? variantOption.var : ['chess']

      // update engines
      context.state.allEngines = {
        ...context.state.allEngines,
        [name]: { binary, cwd, logo, variants }
      }
      localStorage.engines = JSON.stringify(context.state.allEngines)

      // swap back to current engine after we are done
      context.commit('clearIO')
      await engine.run(context.getters.engineBinary, context.getters.selectedEngine.cwd)
      await context.dispatch('initEngineOptions')
    },
    async editEngine (context, payload) {
      console.log('editEngine', payload)
      const { old, changed: { name, binary, cwd, logo } } = payload
      const engines = { ...context.state.allEngines }

      // grab new engine entry
      let updated
      if (name !== old) {
        engines[name] = { ...engines[old] }
        updated = engines[name]
        delete engines[old]
      } else {
        updated = engines[old]
      }

      // update logo
      updated.logo = logo

      // update active engine name
      context.state.activeEngine = name

      // update name in selected engines
      const selectedEngines = { ...context.state.selectedEngines }
      for (const [variant, selected] of Object.entries(selectedEngines)) {
        if (selected === old) {
          selectedEngines[variant] = name
        }
      }
      context.state.selectedEngines = selectedEngines

      // rerun if binary or cwd changed
      if (updated.binary !== binary || updated.cwd !== cwd) {
        await context.dispatch('runBinary', { binary, cwd })
        const variantOption = context.state.engineInfo.options.find(option => option.name === 'UCI_Variant')
        updated.variants = variantOption ? variantOption.var : ['chess']
      }
      updated.binary = binary
      updated.cwd = cwd

      // save engines
      context.state.allEngines = engines
      localStorage.engines = JSON.stringify(context.state.allEngines)
    },
    async deleteEngine (context, payload) {
      console.log('deleteEngine', payload)
      const engines = { ...context.state.allEngines }
      delete engines[payload]
      const missing = Object.entries(context.state.variantOptions.getAll())
        .filter(([_, variant]) => !Object.values(engines).find(engine => engine.variants.includes(variant)))
        .map(([name, _]) => name)
      if (missing.length > 0) {
        alert(`"${payload}" can not be deleted:\nOnly Engine supporting Variants ${missing.join(', ')}!`)
        return
      }
      context.state.allEngines = engines
      localStorage.engines = JSON.stringify(context.state.allEngines)
      await context.dispatch('changeEngine', context.getters.availableEngines[0].name)
    },
    async changeEngine (context, payload) {
      console.warn('changeEngine', payload)
      const { engineName, engineID } = payload
      // always update selected engines
      const selected = {
        ...context.state.selectedEngines,
        [context.getters.variant]: engineName
      }
      context.commit('selectedEngines', selected)

      // only change engine when its a different one
      if (context.getters.activeEngine(engineID) !== engineName) {
        context.commit('activeEngine', { activeEngine: engineName, engineID })
        context.dispatch('runBinary', {
          binary: context.getters.engineBinary(engineID),
          cwd: context.getters.selectedEngine(engineID).cwd,
          engineID
        })
      }
    },
    async runBinary (context, payload) {
      console.log('runBinary', payload)
      const { binary, cwd, engineID } = payload
      const engine = context.getters.computeEngine(engineID)
      if (context.getters.active_new(engineID)) {
        context.commit('active_new', { active: false, engineID })
      }
      context.commit('clearIO', engineID)
      await context.dispatch('resetEngineData', engineID)
      const engineInfo = await engine.run(binary, cwd)
      context.commit('engineInfo', { engineInfo, engineID })
      context.dispatch('defaultSettings', { engineInfo, engineID })
      await context.dispatch('initEngineOptions', engineID)
    },
    initEngineOptions (context, payload) {
      const engineID = payload
      console.log('initEngineOptions', context.getters.activeEngine(engineID))
      const options = {
        // variant & 960 are handled separately and always set
        UCI_Variant: context.getters.variant,
        UCI_Chess960: context.state.board.is960(),

        // multi pv 5 is default
        MultiPV: 5
      }
      const stored = localStorage.getItem('engine' + context.getters.activeEngine(engineID))
      if (stored) {
        Object.assign(options, JSON.parse(stored))
      }

      // this will update the settings in store & local storage
      context.dispatch('setEngineOptions', { engineID, ...options })
    },
    setEngineOptions (context, payload) {
      const engineID = payload.engineID
      delete payload.engineID
      const analysisEngine = context.state.analysisEngines[engineID-1]
      const engine = context.getters.computeEngine(engineID)
      if (analysisEngine.active) {
        context.dispatch('stopEngine', engineID)
      }
      context.dispatch('resetEngineData', engineID)
      for (const [name, value] of Object.entries(payload)) {
        checkOption(analysisEngine.engineInfo.options, name, value)
        if (value !== undefined && value !== null) {
          if (!filteredSettings.includes(name)) {
            this.commit('setEngineOption', { engineID, name, value })
          }
          engine.send(`setoption name ${name} value ${value}`)
        } else {
          engine.send(`setoption name ${name}`)
        }
      }
      localStorage.setItem('engine' + context.getters.activeEngine(engineID), JSON.stringify(analysisEngine.engineSettings))
    },
    addAnalysisEngine (context) {
      context.commit('addAnalysisEngine')
      const engineID = context.state.analysisEngines.length
      context.dispatch('addEngineWatchers', engineID)
    },
    removeAnalysisEngine (context) {
      const engineID = context.getters.numberOfAnalysisEngines
      if (context.getters.active_new(engineID)) {
        context.dispatch('stopEngine', engineID)
      }
      context.commit('removeAnalysisEngine')
    },
    removeAllEngines (context) {
      while (context.state.analysisEngines.length > 1) {
        context.commit('removeAnalysisEngine')
      }
    },
    async changeAnalysisEngine (context, payload) {
      const { name, engineID } = payload
      let index = 0
      const availableEngines = context.getters.availableEngines
      for (index; index < availableEngines.length; index++) {
        if (availableEngines[index].name === name) {
          break
        }
      }
      const engine = context.getters.computeEngine(engineID)
      const engineInfo = await engine.run(availableEngines[index].binary, availableEngines[index].cwd)
      context.commit('setEngineInfo', { engineInfo, engineID })
    },
    async addEngineWatchers (context, payload) {
      const engineID = payload
      const engine = context.getters.computeEngine(engineID)

      // setup debug and error output
      //engine.on('debug', (...msgs) => console.log('%c[Main Engine] Debug:', 'color: #82aaff; font-weight: 700;', ...msgs))
      engine.on('error', (...msgs) => console.error('%c[Main Engine]', 'color: #82aaff; font-weight: 700;', ...msgs))
      //engine.on('eval-debug', (...msgs) => console.log('%c[Eval Engine] Debug:', 'color: #9580ff; font-weight: 700;', ...msgs))
      engine.on('eval-error', (...msgs) => console.error('%c[Eval Engine]', 'color: #9580ff; font-weight: 700;', ...msgs))

      // capture engine info
      engine.on('info', info => store.dispatch('updateMultiPV', { info, engineID }))
      if (engineID == 1) {
        engine.on('bestmove', move => store.dispatch('PvEMakeMove', move))
      }
    },
    idName (context, payload) {
      context.commit('idName', payload)
    },
    idAuthor (context, payload) {
      context.commit('idAuthor', payload)
    },
    updateMultiPV (context, payload) {
      const { info, engineID } = payload

      // ignore pv updates when engine is already removed
      if (context.getters.numberOfAnalysisEngines < engineID) {
        return
      }

      // update engine stats
      const stats = { ...context.state.analysisEngines[engineID-1].engineStats }
      for (const key of Object.keys(stats)) {
        if (key in info) {
          stats[key] = info[key]
        }
      }
      context.commit('engineStats', { stats, engineID })

      // update pvline
      if ('pv' in info) {
        const multipv = context.getters.multipv(engineID).slice(0)

        // handle checkmate
        if (info.mate === 0) {
          multipv[0] = { mate: info.mate }
        } else {
          const ucimove = info.pv.split(/\s/)[0]
          const { board } = context.state

          // assert first move is valid
          if (board.legalMoves().includes(ucimove)) {
            const pvline = {
              cp: info.cp,
              mate: info.mate,
              wdl: info.wdl,
              pvUCI: info.pv,
              ucimove
            }
            try {
              pvline.pv = board.variationSan(info.pv)
            } catch (err) {
              // currently invalid moves cause ffish to error mid calculation and fail to reset the fen
              // so to avoid getting stuck with a future fen, we reset the board fen on error
              board.setFen(context.state.fen)
              console.warn('Invalid engine pv move.\nFEN:', board.fen(), '\nPV:', info.pv)
            }
            if (info.multipv === undefined) {
              multipv[0] = pvline
            } else {
              multipv[info.multipv - 1] = pvline
            }
          }
        }
        context.commit('multipv', { lines: multipv, engineID })
      }
    },
    loadedGames (context, payload) {
      context.commit('loadedGames', payload)
    },
    rounds (context, payload) {
      context.commit('rounds', payload)
    },
    async loadGame (context, payload) {
      context.commit('openedPGN', true)
      let variant = payload.game.headers('Variant').toLowerCase()
      if (variant === '') { // if no variant is given we assume it to be standard chess
        variant = 'chess'
      }

      if (!context.getters.variantOptions.revGet(variant)) {
        alert('This variant is currently not supported.')
        return
      }

      const gameInfo = {}
      for (const curVal of payload.game.headerKeys().split(' ')) {
        gameInfo[curVal] = payload.game.headers(curVal)
      }

      let fen = payload.game.headers('FEN')

      let is960 = false
      if (variant === 'fischerandom' || variant === 'chess960') {
        variant = 'chess'
        is960 = true
        context.state.curVar960Fen = fen
      }

      await context.dispatch('variant', variant)

      if (fen === '') { // if no FEN is given we use the standard starting FEN for this variant
        context.commit('newBoard')
        fen = context.state.startFen
      } else {
        context.commit('newBoard', { fen: fen, is960: is960 })
      }
      await context.dispatch('fen', fen)

      context.commit('selectedGame', payload.game)
      context.commit('gameInfo', gameInfo)
      const moves = payload.game.mainlineMoves().split(' ')
      for (const num in moves) {
        if (num === 0) {
          context.commit('appendMoves', { move: moves[num], prev: undefined })
        } else {
          context.commit('appendMoves', { move: moves[num], prev: context.state.moves[num - 1] }) // TODO differentiate between alternative lines
        }
      }
      context.dispatch('updateBoard')
      context.dispatch('setEngineOptions', { UCI_Chess960: is960, engineID: 1 })
      context.commit('openedPGN', false)
    },
    increment (context, payload) {
      context.commit('increment', payload)
    },
    pieceStyle (context, payload) {
      context.commit('pieceStyle', payload)
    },
    viewAnalysis (context, payload) {
      context.commit('viewAnalysis', payload)
    },
    boardStyle (context, payload) {
      context.commit('boardStyle', payload)
    },
    analysisMode (context, payload) {
      context.commit('analysisMode', payload)
    },
    openedPGN (context, payload) {
      context.commit('openedPGN', payload)
    },
    menuAtMove (context, payload) {
      context.commit('menuAtMove', payload)
    },
    displayMenu (context, payload) {
      context.commit('displayMenu', payload)
    },
    setDarkMode (context, payload) {
      context.commit('setDarkMode', payload)
    },
    quicktourIndexIncr (context) {
      context.commit('quicktourIndexIncr')
    },
    quicktourIndexDecr (context) {
      context.commit('quicktourIndexDecr')
    },
    quicktourSetZero (context) {
      context.commit('quicktourSetZero')
    },
    switchMuteButton (context) {
      context.commit('switchMuteButton')
    },
    evalPlotDepth (context, payload) {
      context.commit('evalPlotDepth', payload)
    },
    saveSettings (context) {
      context.commit('saveSettings')
    }
  },
  getters: {
    currentMove (state) {
      return state.moves.filter(moves => moves.fen === state.fen)
    },
    getMoveByUCIAndPrev (state, uci, prev) {
      return (uci, prev) => state.moves.filter(moves => moves.uci === uci && moves.prev === prev)
      /* const moves = state.moves
      for (const i in moves) {
        if (moves[i].uci === uci && moves[i].prev === prev) {
          return moves[i]
        }
      }
      return null */
    },
    curVar960Fen (state) {
      return state.curVar960Fen
    },
    board (state) {
      return state.board
    },
    initialized (state) {
      return state.initialized
    },
    active (state) {
      return state.active
    },
    active_new (state) {
      return (engineID) => state.analysisEngines[engineID-1].active
    },
    activeEngine (state) {
      return (engineID) => state.analysisEngines[engineID-1].activeEngine
    },
    computeEngine (state) {
      return (engineID) => state.analysisEngines[engineID-1].engine
    },
    numberOfAnalysisEngines (state) {
      return state.analysisEngines.length
    },
    PvE (state) {
      return state.PvE
    },
    PvEParam (state) {
      return state.PvEParam
    },
    PvEValue (state) {
      return state.PvEValue
    },
    PvEInput (state) {
      return state.PvEInput
    },
    dimNumber (state) {
      return state.dimNumber
    },
    resized (state) {
      return state.resized
    },
    resized9x9width (state) {
      return state.resized9x9width
    },
    resized9x9height (state) {
      return state.resized9x9height
    },
    resized9x10width (state) {
      return state.resized9x10width
    },
    resized9x10height (state) {
      return state.resized9x10height
    },
    started (state) {
      return state.started
    },
    redraw (state) {
      return state.redraw
    },
    fen (state) {
      return state.fen
    },
    lastFen (state) {
      return state.lastFen
    },
    startFen (state) {
      return state.startFen
    },
    isPast (state, getters) {
      return state.fen !== getters.lastFen
    },
    destinations (state) {
      return state.destinations
    },
    orientation (state) {
      return state.orientation
    },
    variant (state) {
      return state.variant
    },
    variantOptions (state) {
      return state.variantOptions
    },
    availableEngines (state, getters) {
      return Object.entries(state.allEngines)
        .map(([name, info]) => ({ name, ...info }))
        .filter(engine => engine.variants && engine.variants.includes(getters.variant))
    },
    selectedEngine (state) {
      return (engineID) => ({ name: state.analysisEngines[engineID-1].activeEngine, ...state.allEngines[state.analysisEngines[engineID-1].activeEngine] })
    },
    engineBinary (state, getters) {
      return (engineID) => getters.selectedEngine(engineID).binary
    },
    engineName (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineInfo.name
    },
    engineAuthor (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineInfo.author
    },
    engineOptions (state) {
      return state.engineInfo.options.filter(({ name }) => !filteredSettings.includes(name))
    },
    engineSettings (state) {
      return state.engineSettings
    },
    multipv (state) {
      return (engineID) => state.analysisEngines[engineID-1].multipv
    },
    hoveredpv (state) {
      return state.hoveredpv
    },
    cp (state) {
      return state.multipv[0].cp
    },
    depth (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineStats.depth
    },
    nps (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineStats.nps
    },
    seldepth (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineStats.seldepth
    },
    nodes (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineStats.nodes
    },
    hashfull (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineStats.hashfull
    },
    tbhits (state) {
      return (engineID) => state.analysisEngines[engineID-1].engineStats.tbhits
    },
    time (state) {
      return state.engineStats.time
    },
    enginetime (state) {
      return (engineID) => state.analysisEngines[engineID-1].enginetime
    },
    pv (state) {
      return state.multipv[0].pv
    },
    cpForWhite (state) {
      return (engineID) => calcForSide(state.analysisEngines[engineID-1].multipv[0].cp, state.turn)
    },
    cpForWhiteStr (state, getters) {
      return (engineID) => {
        const currentMove = getters.currentMove[0]
        const { mate } = state.analysisEngines[engineID-1].multipv[0]

        // TODO: Update this block when ffish.board.is_terminal() or ffish.board.check_result() is available
        // Temporary fix, as lang as we don't have an `is_terminal()` or `check_result` function
        // if the SAN in the pgn is the same than the SAN in states.moves
        // and we are at the last move, return pgn result
        if (state.selectedGame) {
          const pgnBoard = new ffish.Board(state.variant, state.startFen)

          const pgnMoves = state.selectedGame.mainlineMoves()
          const san = pgnBoard.variationSan(pgnMoves, ffish.Notation.SAN, false)
          let str = ''
          state.moves.forEach(move => { str += move.name })
          const lastMove = state.moves[state.moves.length - 1]
          if (san.replace(/ /g, '') === str.replace(/ /g, '')) {
            if (lastMove === currentMove && lastMove.ply === currentMove.ply) {
              return state.selectedGame.headers('Result')
            }
          }
        }

        if (typeof mate === 'number') {
          return `#${calcForSide(mate, state.turn)}`
        } else if (state.board != null && state.board.isGameOver()) {
          return state.board.result()
        } else {
          return cpToString(getters.cpForWhite(engineID))
        }
      }
    },
    cpForWhitePerc (state, getters) {
      return (engineID) => {
        const currentMove = getters.currentMove[0]
        const { mate } = state.analysisEngines[engineID-1].multipv[0]
        if (typeof mate === 'number') {
          return (calcForSide(Math.sign(mate), state.turn) + 1) / 2
        } else if (currentMove && currentMove.name.includes('#')) {
          return state.turn ? 0 : 1
        } else {
          return 1 / (1 + Math.exp(-0.003 * getters.cpForWhite(engineID)))
        }
      }
    },
    message (state) {
      return state.message.toUpperCase()
    },
    counter (state) {
      return state.counter
    },
    pieceStyle (state) {
      return state.pieceStyle
    },
    boardStyle (state) {
      return state.boardStyle
    },
    turn (state) {
      return state.turn
    },
    moves (state) {
      return state.moves
    },
    firstMoves (state) {
      return state.firstMoves
    },
    mainFirstMove (state) {
      return state.mainFirstMove
    },
    legalMoves (state) {
      return state.legalMoves
    },
    pocket (state) {
      return (turn) => state.board.pocket(turn)
    },
    gameInfo (state) {
      return state.gameInfo
    },
    loadedGames (state) {
      return state.loadedGames
    },
    rounds (state) {
      return state.rounds
    },
    selectedGame (state) {
      return state.selectedGame
    },
    isInternational (state) {
      return state.internationalVariants.includes(state.variant)
    },
    isSEA (state) {
      return state.seaVariants.includes(state.variant)
    },
    isXiangqi (state) {
      return state.xiangqiVariants.includes(state.variant)
    },
    isJanggi (state) {
      return state.janggiVariants.includes(state.variant)
    },
    isShogi (state) {
      return state.shogiVariants.includes(state.variant)
    },

    // TODO: integrate getters into store state?
    moveStack (state) {
      return state.board.moveStack()
    },
    isGameOver (state) {
      return state.board.isGameOver()
    },
    sanMove (state) {
      return (uciMove) => state.board.sanMove(uciMove)
    },
    is960 (state) {
      return state.board.is960()
    },
    dimensionNumber (state) {
      if (state.internationalVariants.includes(state.variant)) {
        return 0
      } else {
        const var2Dim = {
          shogi: 1, xiangqi: 3, janggi: 3, makruk: 0
        }
        return var2Dim[state.variant]
      }
    },
    viewAnalysis (state) {
      return state.viewAnalysis
    },
    evalPlotDepth (state) {
      return state.evalPlotDepth
    },
    openedPGN (state) {
      return state.openedPGN
    },
    analysisMode (state) {
      return state.analysisMode
    },
    menuAtMove (state) {
      return state.menuAtMove
    },
    displayMenu (state) {
      return state.displayMenu
    },
    darkMode (state) {
      return state.darkMode
    },
    QuickTourIndex (state) {
      return state.QuickTourIndex
    },
    muteButton (state) {
      return state.muteButton
    }
  }
})

ffish.onRuntimeInitialized = () => {
  console.log('allEngines', store.state.allEngines)
  store.dispatch('initializeBoard')
}

store.dispatch('addEngineWatchers', 1)