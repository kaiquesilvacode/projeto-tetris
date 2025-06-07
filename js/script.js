const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")

const score = document.querySelector(".score--value")
const finalScore = document.querySelector(".final-score > span")
const menuLogin = document.querySelector(".menu-login")
const buttonPlay = document.querySelector(".btn-play")
const menuGameOver = document.querySelector(".menu-gameOver")
const buttonPlayAgain = document.querySelector(".btn-playAgain")
const record = document.querySelector(".record > span")
const btnShowRecord = document.querySelector('.btn-show-record');
const btnCloseRecord = document.querySelector('.btn-close-record');
const recordWindow = document.querySelector('.record-window');
const backgroundMusic = new Audio("/projeto-tetris/assets/background-music.mp3")
const sfxMove = new Audio("/projeto-tetris/assets/move.mp3")
const sfxDrop = new Audio("/projeto-tetris/assets/drop.mp3")
const sfxClear = new Audio("/projeto-tetris/assets/clear.mp3")
const sfxGameOver = new Audio("/projeto-tetris/assets/gameover.mp3")

backgroundMusic.loop = true
backgroundMusic.volume = 0.3
sfxGameOver.volume = 0.2
sfxMove.volume = 0.2
sfxDrop.volume = 0.2
sfxClear.volume = 0.2

const size = 40
const cols = canvas.width / size // 10 colunas
const rows = canvas.height / size // 15 linhas

let linesToClear = []
let clearing = false
let currentScore = 0
let recordScore = 0
recordScore = Number(localStorage.getItem("recordScore")) || 0
record.textContent = recordScore
let lastTime = 0
let dropCounter = 0
const dropInterval = 800
let shakeTime = 0
let shakeIntensity = 5
let isGameOver = false

const inicialPosition = { x: 4, y: -1}

let particles = []

class Particle {
    constructor(x, y) {
        this.x = x * size + size / 2
        this.y = y * size + size / 2
        this.radius = Math.random() * 4 + 2
        this.alpha = 1
        this.vx = (Math.random() - 0.5) * 2
        this.vy = Math.random() * -2 - 1
    }

    update() {
        this.x += this.vx
        this.y += this.vy
        this.alpha -= 0.02
    }

    draw() {
        ctx.save()
        ctx.globalAlpha = this.alpha
        ctx.fillStyle = "#ccc"
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }

    isDead() {
        return this.alpha <= 0
    }
}

const tetrominos = {
    T: [
        [ 0, 1, 0 ],
        [ 1, 1, 1 ],
        [ 0, 0, 0 ]
    ],

    I: [
        [ 0, 0, 0, 0 ],
        [ 1, 1, 1, 1 ],
        [ 0, 0, 0, 0 ],
        [ 0, 0, 0, 0 ]
    ],

    J: [
        [ 1, 0, 0 ],
        [ 1, 1, 1 ],
        [ 0, 0, 0 ]
    ],

    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ],

    O: [
        [1, 1],
        [1, 1],
    ],

    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],

    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ]
}

const block = {
    matrix: tetrominos['I'],
    position: { ...inicialPosition}
}

let direction

//CRIA O "CAMPO DE JOGO"
const createMatrix = (w, h) => {
    const matrix = []
    while (h--) {
        matrix.push(new Array(w).fill(0))
    }
    return matrix
}

const arena = createMatrix(cols, rows)

//MESCLA A PEÇA NA ARENA
const merge = (arena, block) => {
    block.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const arenaX = x + block.position.x
                const arenaY = y + block.position.y

                if (arenaY >= 0 && arenaY < rows && arenaX >= 0 && arenaX < cols) {
                        arena[arenaY][arenaX] = {
                            color: block.color
                        }
                }
            }
        })
    })
}

const drawArena = () => {
    arena.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell !== 0) {
                const px = x * size
                const py = y * size

                const fillColor = linesToClear.includes(y) ? '#ff0' : cell.color // efeito visual

                ctx.fillStyle = fillColor
                ctx.fillRect(px, py, size, size)

                ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
                ctx.lineWidth = 2
                ctx.strokeRect(px, py, size, size)
            }
        })
    })
}

//DESENHA OS TETROMINOS
const drawMatrix = (matrix, offset, color = "white") => { 
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const px = (x + offset.x) * size
                const py = (y + offset.y) * size

                ctx.fillStyle = color;
                ctx.fillRect((x + offset.x) * size, (y + offset.y) * size, size, size)

                ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
                ctx.lineWidth = 2
                ctx.strokeRect(px, py, size, size)
            }
        })
    })
}

//DESENHA AS GRADES
const drawGrid = () => { //desenha uma grade
    ctx.lineWidth = 1 //define a espessura das linhas
    ctx.strokeStyle = "#191919" //define a cor das linhas

    for (let i = 40; i < canvas.width; i += 40) {
        ctx.beginPath() //indica que uma linha será traçada
        ctx.lineTo(i, 0) //linha vertical de cima
        ctx.lineTo(i, 600) //até embaixo
        ctx.stroke()
    }

    for (let i = 40; i < canvas.height; i += 40) {
        ctx.beginPath()
        ctx.lineTo(0, i) //linha horizontal da esquerda
        ctx.lineTo(400, i)// até a direita
        ctx.stroke()
    }
    
}

const draw = () => {
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity
        const dy = (Math.random() - 0.5) * shakeIntensity
        
        ctx.translate(dx, dy)
        shakeTime--
    }

    drawGrid()
    drawArena()

    const ghost = getGhostPosition()
    drawMatrix(ghost.matrix, ghost.position, "rgba(255, 255, 255, 0.3)")
    drawMatrix(block.matrix, block.position, block.color)

    particles.forEach(p => {
        p.update()
        p.draw()
    })

    particles = particles.filter(p => !p.isDead())

    
    ctx.restore() // restaura após o shake

}

const getGhostPosition = () => {
    const ghost = {
        matrix: block.matrix,
        position: { ...block.position }
    }

    while (!checkCollision(ghost.matrix, { x: ghost.position.x, y: ghost.position.y + 1 })) {
        ghost.position.y++
    }

    return ghost
}

//APLICA ROTAÇÃO NO SENTIDO HORÁRIO
const rotateMatrixClockwise = (matrix) => {
    const size = matrix.length
    const rotated = []

    for (let y = 0; y < size; y++)
    {
        rotated[y] = []
        for (let x = 0; x < size; x++) {
            rotated[y][x] = matrix[size - x - 1][y]
        }
    }

    return rotated

}

//APLICA ROTAÇÃO NO SENTIDO ANTI-HORÁRIO
const rotateMatrixCounterClockwise = (matrix) => {
    const size = matrix.length
    const rotated = []

    for (let y = 0; y < size; y++)
    {
        rotated[y] = []
        for (let x = 0; x < size; x++) {
            rotated[y][x] = matrix[x][size - y - 1]
        }
    }

    return rotated

}

//DESFAZ A ROTAÇÃO SE HOUVER COLISÃO
const tryRotate = (rotationFn) => {
    const rotatedMatrix = rotationFn(block.matrix)
    const originalMatrix = block.matrix

    const originalX = block.position.x
    
    const offsets = [0, -1, 1, -2, 2]

    for (let offset of offsets) {
        block.matrix = rotatedMatrix
        block.position.x = originalX + offset

        if (!checkCollision(block.matrix, block.position)) {
            sfxMove.currentTime = 0
            sfxMove.play()
            return
        }
    }

    block.matrix = originalMatrix
    block.position.x = originalX
    
}

//CRIA UMA NOVA PEÇA
const resetBlock = () => {
    const types = Object.keys(tetrominos)
    const random = types[Math.floor(Math.random() * types.length)]
    block.matrix = tetrominos[random]
    block.position = { x: 4, y: -1}

    //Gera uma cor HSL aleatória para essa peça
    block.color = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`

    //Verifica se já colisão ao inserir nova peça
    if (checkCollision(block.matrix, block.position)) {
        gameOver()
    }
}

//CHECA SE HÁ COLISÃO
const checkCollision = (matrix, pos) => {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0) {
                const newX = x + pos.x
                const newY = y + pos.y

                if (
                    newX < 0 || newX >= cols || newY >= rows ||
                    (newY >= 0 && arena[newY][newX] !== 0) //COLISÃO COM PEÇA ANTERIOR
                ) {
                    return true
                }
            }
        }
    }

    return false

}

//QUEDA
const moveDown = () => {
    block.position.y++
    if (checkCollision(block.matrix, block.position)) {
        block.position.y--
        merge(arena, block)
        sfxDrop.currentTime = 0
        sfxDrop.play()
        block.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                 if (value !== 0) {
                    const px = x + block.position.x
                    const py = y + block.position.y
                    for (let i = 0; i < 5; i++) {
                        particles.push(new Particle(px, py))
            }
        }
    })
})
        detectFullLines()
        resetBlock()
    }
}

//MOVIMENTO LATERAL
const moveHorizontal = (dir) => {
    block.position.x += dir
    if (checkCollision(block.matrix, block.position)) {
        block.position.x -= dir
    }
    sfxMove.currentTime = 0
    sfxMove.play()
}

const hardDrop = () => {
    while (!checkCollision(block.matrix, { x: block.position.x, y: block.position.y + 1 })) {
        block.position.y++
    }

    merge(arena, block)

    // Gerar partículas
    block.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const px = x + block.position.x
                const py = y + block.position.y
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(px, py))
                }
            }
        })
    })

    // Reproduzir som (opcional)
    if (typeof sfxDrop !== "undefined") {
        sfxDrop.currentTime = 0
        sfxDrop.play()
    }

    detectFullLines()
    resetBlock()
}

//DETECTA LINHAS COMPLETAS
const detectFullLines = () => {
    linesToClear = []

    for (let y = arena.length - 1; y >= 0; y--) {
        if (arena[y].every(cell => cell !== 0)) {
            linesToClear.push(y)
        }
    }

    if (linesToClear.length > 0) {
        shakeTime = 10
        clearing = true

        linesToClear.forEach(y => {
        for (let x = 0; x < cols; x++) {
            for (let i = 0; i < 8; i++) {
                particles.push(new Particle(x, y))
            }
        }
    })

        setTimeout(() => {
            clearLines()
            clearing = false
        }, 200)
    }
}

//LIMPA AS LINHAS COMPLETAS
const clearLines = () => {
    linesToClear.forEach(y => {
        arena.splice(y, 1)
        arena.unshift(new Array(cols).fill(0))
    })

    currentScore += linesToClear.length * 10
    score.textContent = currentScore
    finalScore.textContent = currentScore

    linesToClear = []

    sfxClear.currentTime = 0
    sfxClear.play()
}

const gameOver = () => {
    isGameOver = true
    menuGameOver.classList.remove("hidden")
    menuGameOver.classList.add("show")
    backgroundMusic.pause()
    sfxGameOver.currentTime = 0
    sfxGameOver.play()
}

const update = (time = 0) => {
    if (isGameOver) return

    const deltaTime = time - lastTime
    lastTime = time

    dropCounter += deltaTime
    if (dropCounter > dropInterval) {
        moveDown()
        dropCounter = 0
    }

    draw()
    requestAnimationFrame(update)

    
}

document.addEventListener('keydown', ({key}) => {
    if (key === "ArrowLeft") { 
        moveHorizontal(-1) 
    } else if  (key === "ArrowRight") { 
        moveHorizontal(1)
    } else if  (key === "ArrowDown") { 
        moveDown() 
    } else if (key === "v" || key === "V") {
        tryRotate(rotateMatrixClockwise)
        draw()
    } else if (key === "c" || key === "C") {
        tryRotate(rotateMatrixCounterClockwise)
        draw()
    } else if (key === " ") {
        hardDrop()
    }
})

buttonPlay.addEventListener("click", () => {
    backgroundMusic.currentTime = 0
    backgroundMusic.play()

    isGameOver = false
    menuLogin.classList.add("hidden")
    resetBlock()
    update()
})

buttonPlayAgain.addEventListener("click", () => {
    backgroundMusic.currentTime = 0
    backgroundMusic.play()

    isGameOver = false
    for (let y = 0; y < arena.length; y++) {
        arena[y].fill(0)
    }

    if (currentScore > recordScore) {
        recordScore = currentScore
        localStorage.setItem("recordScore", recordScore)
        record.textContent = recordScore
    }
    
    currentScore = 0
    score.textContent = currentScore

    resetBlock()

    menuGameOver.classList.remove("show")
    menuGameOver.classList.add("hidden")
    update()
})

document.getElementById("btn-left").addEventListener("touchstart", () => moveHorizontal(-1))
document.getElementById("btn-right").addEventListener("touchstart", () => moveHorizontal(1))
document.getElementById("btn-down").addEventListener("touchstart", () => moveDown())
document.getElementById("btn-rotate").addEventListener("touchstart", () => {
    tryRotate(rotateMatrixClockwise)
    draw()
})
document.getElementById("btn-drop").addEventListener("touchstart", () => hardDrop())

const updateRecordDisplay = () => {
  const record = localStorage.getItem('record') || 0
  record.textContent = recordScore
}

btnShowRecord.addEventListener('click', () => {
  updateRecordDisplay()
  recordWindow.classList.remove('hidden')
});

btnCloseRecord.addEventListener('click', () => {
  recordWindow.classList.add('hidden')
});