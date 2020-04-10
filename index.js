/**
 * Russians comments
 *
 * Это сырая версия кода: нет ни нормального разделения кодаж, ни более-менее серьезных решений для оптимизации. Комментарии не везде, а местами встречаются «временные решения».
 * В общем, нужен рефакторинг.
 *
 * Как я понял на codewars.com можно загружать решения только ввиде одного файла-скрипта — скорее всего, я со временем доработаю это решение и выложу отдельно на гитхаб.
 * https://github.com/tizis
 */

/**
 * Нахождение координат выхода
 *
 * Функция возвращает массив всез возможных вызодов из матрицы
 * @param maze
 * @returns {[]}
 */
function getExitCoordinates(maze = []) {
    const height = maze.length,
        width = maze[0].length,
        exitPositions = [],
        isExit = (symbol) => {
            return symbol !== '#';
        },
        /**
         * Это тупик?
         * Функция проверяет существование соседних ячеек в матрице, и проверяет находится ли во всех соседних ячейках стена
         * @param maze
         * @param coordinates
         * @returns {boolean}
         */
        isDeadEnd = (maze, coordinates) => {

            const neighbors = [
                makeCoordinates(coordinates.x + 1, coordinates.y),
                makeCoordinates(coordinates.x - 1, coordinates.y),
                makeCoordinates(coordinates.x, coordinates.y + 1),
                makeCoordinates(coordinates.x, coordinates.y - 1),
            ]

            let response = true;

            neighbors.forEach(neighborCoordinates => {

                if (maze[neighborCoordinates.x] === undefined) {
                    return;
                }

                if (maze[neighborCoordinates.x][neighborCoordinates.y] === undefined) {
                    return;
                }

                if (maze[neighborCoordinates.x][neighborCoordinates.y] === '#') {
                    return
                }

                response = false;
            })

            return response;
        }

    // Обход верхней и нижней границы матрицы
    [0, height - 1].forEach(x => {
        maze[x].forEach((symbol, y) => {

            let coordinatesObject = makeCoordinates(x, y)

            if (!isExit(symbol)) {
                return;
            }

            if (isDeadEnd(maze, coordinatesObject)) {
                return;
            }

            exitPositions.push(coordinatesObject)
        })
    })

    // Обход левой и правой границы матрицы
    for (let x = 0; x <= height - 1; x++) {
        let columns = [0, width - 1]

        columns.forEach((y) => {
            let symbol = maze[x][y]

            // Дублирование кода
            let coordinatesObject = makeCoordinates(x, y)

            if (!isExit(symbol)) {
                return;
            }

            if (isDeadEnd(maze, coordinatesObject)) {
                return;
            }

            exitPositions.push(coordinatesObject)
        })

    }

    return exitPositions
}

/**
 * Функция проходит по матрице и ищет символы-обозначения игрока
 * @param matrix
 * @returns {{x: *, y: *}}
 */
function getPlayerStartCoordinates(matrix) {

    const isPlayer = (symbol) => {
        const playerSymbols = ['^', '<', 'v', '>'];

        return playerSymbols.includes(symbol)
    }

    for (let x = 0; x <= matrix.length - 1; x++) {
        for (let y = 0; y <= matrix[x].length - 1; y++) {
            if (isPlayer(matrix[x][y])) {
                return makeCoordinates(x, y)
            }
        }
    }

}

function getCoordinatesHash(coordinates) {
    return coordinates.x + ':' + coordinates.y
}

function makeCoordinates(x, y) {
    return {
        x: x,
        y: y
    }
}

function parseCoordinates(point) {

    point = point.split(':')
    return {
        x: parseInt(point[0]),
        y: parseInt(point[1])
    }
}

function paintStepsWithoutTimeout(matrix, path) {
    path.forEach((point, index) => {
        let coordinates = parseCoordinates(point);
        matrix[coordinates.x][coordinates.y] = index;
    })

    console.table(matrix);
}

/**
 * Реализация модифицированного Depth-first search
 * Модификация заключается в сортировке приоритета при выборе следующей вершины
 * Сортировка заключается в поиске наименьшей стоимости между двумя вершинами (текущая и выход)
 *
 * @param graph
 * @param startCoordinates
 * @param exitCoordinates
 * @returns {*[]}
 */
function dfsPriority(graph, startCoordinates, exitCoordinates) {

    const exitCoordinatesHash = getCoordinatesHash(exitCoordinates),
        startCoordinatesHash = getCoordinatesHash(startCoordinates);

    // Пройденный путь и метка означающая закончен ли поиск или нет. Метка является костылем т.к. не получилось по другому реализовать выход из итераций поиска.
    let visited = [],
        finished = false;

    /**
     * Удаление тупиковых ветвей найденного пути до цели
     *
     * Принцип работы — перебор пути и отсечение последовательности координат, которрые сильно отличаются при последовательном чтении пути.
     * Работает только если начать поиск с конца, поэтому на выходе и на выходе массив реверсируется
     *
     * @param path
     * @returns {[]}
     */
    const cutUselessBranches = (path) => {
        // Копирование массива для избежания изменений по ссылке
        path = [...path].reverse();

        // Если currentMark не null — значит произошла большая разница между координами вершин, т.е. происходит отсечение отвлетвлений от основного пути.
        let currentMark = null,
            // Это новый массив, в котором есть только прямой путь до цели, без отклонений в пути
            optimizeVisited = [];

        // Функция — проверка явлюятся ли две координами соседями
        const twoCoordinatesIsNeighbors = (coordinatesA, coordinatesB) => {
            // Проверка соседей по оси x
            if (coordinatesA.x === coordinatesB.x && (coordinatesA.y + 1 === coordinatesB.y || coordinatesA.y - 1 === coordinatesB.y)) {
                return true;
            }
            // Проверка соседей по оси Y
            return (coordinatesA.x + 1 === coordinatesB.x || coordinatesA.x - 1 === coordinatesB.x) && coordinatesA.y === coordinatesB.y
        }

        // Основа — последовательный обход с конца неоптимизированного пути от игрока до выхода
        path.forEach((hashedCoordinate, index) => {

            // Если сейчас начало или конец пути — добавляемый координаты сразу в новый путь.
            // Но не скипаем проверку отхода от пути — если это сделать то будет проигнорирован случае если у самого выхода есть развилка.
            if (path.length - 1 === index || index === 0) {
                optimizeVisited.push(hashedCoordinate)
            }

            // Если следующей координаты не существует
            if (path[index + 1] === undefined) {
                return;
            }

            let currentCoordinate = parseCoordinates(hashedCoordinate),
                nextCoordinate = parseCoordinates(path[index + 1]);

            // Если метка пропуска координат не пуста, то проверяем = находится ли текщая координата в пределах одной клетки от currentMark
            // В случае, если текущая координата рядом — очищаем метку и добавляемый текущую координату в новый путь и переходим к следующей итерации
            if (currentMark !== null) {

                if (twoCoordinatesIsNeighbors(currentCoordinate, currentMark)) {

                    optimizeVisited.push(hashedCoordinate)
                    currentMark = null
                }

                return;
            }

            // Если две координаты не явлюятся соседями. Эта часть срабатывает толькое если currentMark пуста
            if (!twoCoordinatesIsNeighbors(currentCoordinate, nextCoordinate)) {

                currentMark = currentCoordinate
                optimizeVisited.push(hashedCoordinate)

                return;
            }

            // Просто добавляем в новый путь текущие координаты, если currentMark пуста, и не была создана новая currentMark
            optimizeVisited.push(hashedCoordinate)
        })

        return optimizeVisited.reverse();
    }

    /**
     * Сортировка по приоритету дальности ткоординат до цели. Чем меньше стоимость — тем выше в приоритете
     * @param goalCoordinates
     * @param nodes
     * @returns {this}
     */
    const heuristicPrioritySort = (goalCoordinates, nodes) => {
        // Копирование массива т.к. иначе проичходит изменение по ссылке
        nodes = [...nodes];

        // Сортировка вложенных вершин (соседей). Чем ниже стоимость между двумя вершинами — тем выше вложенная вершина.
        nodes = nodes.sort((a, b) => {
            let aCoordinates = parseCoordinates(a),
                bCoordinates = parseCoordinates(b)

            return ((goalCoordinates.x - aCoordinates.x) + (goalCoordinates.y - aCoordinates.y)) - ((goalCoordinates.x - bCoordinates.x) + (goalCoordinates.y - bCoordinates.y))
        })

        return nodes;
    }

    /**
     * Сама реализация простого DFS (поиск в глубину в графе)
     * Рекурсия. При первом запуске в качестве аргументов передаются граф и позиция игрока
     *
     * @param graph
     * @param startNode
     */
    const dfsLoop = (graph, startNode) => {

        if (finished) {
            return;
        }

        visited.push(startNode)

        // Сортировка очереди вершин по приоритету
        let nodeQueue = heuristicPrioritySort(exitCoordinates, graph[startNode])

        // Обход вершин-соседей startNode
        for (let vertex of nodeQueue) {

            // Если уже посещали вершину
            if (visited.indexOf(vertex) !== -1) {
                continue;
            }

            // Если найден выход
            if (vertex === exitCoordinatesHash) {
                visited.push(vertex)
                finished = true;
                break;
            }

            dfsLoop(graph, vertex);
        }
    }

    dfsLoop(graph, startCoordinatesHash)

    let completePath = cutUselessBranches(visited);

    /* console.log(completePath)*/
    return completePath;
}

/**
 * Создание графа из матрицы
 *
 * @param matrix
 * @param playerCoordinates
 * @param exitCoordinates
 * @returns {{}}
 */
function graphFromMatrix(matrix, playerCoordinates, exitCoordinates) {

    const optimizeVertex = (graph) => {
        let deletedVertex = [];

        const clearGraph = (graph) => {

            let newGraph = {}
            for (let node in graph) {

                if (!graph.hasOwnProperty(node)) {
                    continue;
                }


                newGraph[node] = graph[node].filter(value => {
                    return !deletedVertex.includes(value)
                })
            }

            return newGraph
        }

        return graph;
    }

    let graph = {};

    matrix.forEach((line, x) => {
        line.forEach((symbol, y) => {

            let relations = []

            if (symbol === '#') {
                return;
            }

            if (x > 0 && matrix[x - 1][y] !== '#') {
                relations.push((x - 1).toString() + ':' + y)
            }

            if ((x + 1 <= matrix.length - 1) && matrix[x + 1][y] !== '#') {
                relations.push((x + 1).toString() + ':' + y)
            }

            if (y > 0 && (y - 1 <= matrix[x].length - 1) && matrix[x][y - 1] !== '#') {
                relations.push(x + ':' + (y - 1).toString())
            }

            if ((y + 1 <= matrix[x].length - 1) && matrix[x][y + 1] !== '#') {
                relations.push(x + ':' + (y + 1).toString())
            }

            graph[x + ':' + y] = relations
        })
    })

    graph = optimizeVertex(graph);

    return graph;
}

/**
 * Преобразование матрицы из заруженного массива-рисунка
 * @param maze
 * @returns {[]}
 */
function matrixFromMaze(maze) {
    let response = [];

    maze.forEach((line, index) => {

        response[index] = []

        Array.from(line).forEach((symbol, symbolIndex) => {
            response[index][symbolIndex] = symbol
        })

    })

    return response
}

function rotatePlayerFromTo(from, to) {

    const left = 'L',
        right = 'R',
        back = 'B',
        forward = 'F'

    const map = {
        '^': {
            '>': right,
            'v': back,
            '<': left
        },
        '>': {
            'v': right,
            '<': back,
            '^': left
        },
        'v': {
            '<': right,
            '^': back,
            '>': left
        },
        '<': {
            '^': right,
            '>': back,
            'v': left
        },
    }

    if (from === to) {
        return null
    }

    return map[from][to]
}

/**
 * Функция нужна если игрок со старта сразу находится на точке выхода
 * Возвращает массив с одной буковй-символом поворотом игрока
 *
 * В условиях проичходит поиск не существущих координат x y — они это сторона выхода
 * @param matrix
 * @param playerPosition
 * @param playerStartSymbol
 * @returns {*}
 */
function playerOnExitByStartRotateAdapter(matrix, playerPosition, playerStartSymbol) {

    let nextRotate;

    if (!matrix[playerPosition.x].includes(playerPosition.y + 1)) {
        nextRotate = rotatePlayerFromTo(playerStartSymbol, '>')
    }

    if (!matrix[playerPosition.x].includes(playerPosition.y - 1)) {
        nextRotate = rotatePlayerFromTo(playerStartSymbol, '<')
    }

    if (!matrix.includes(playerPosition.x + 1)) {
        nextRotate = rotatePlayerFromTo(playerStartSymbol, 'v')
    }

    if (!matrix.includes(playerPosition.x - 1)) {
        nextRotate = rotatePlayerFromTo(playerStartSymbol, '^')
    }

    return nextRotate;
}


function graphPathIntoPlayerActionsQueueAdapter(path, playerStartSymbol) {

    const forward = 'F';

    let actions = [],
        currentState = playerStartSymbol;

    const rotate = (currentCoordinates, nextCoordinates, currentState) => {

        // if (currentCoordinate.x !== nextCoordinate.x && (currentCoordinate.y !== nextCoordinate.y)) {

        let nextStateSymbol = null,
            rotateCode = null

        if (currentCoordinates.x === nextCoordinates.x) {

            nextStateSymbol = currentCoordinates.y > nextCoordinates.y ? '<' : '>'

            rotateCode = rotatePlayerFromTo(currentState, nextStateSymbol)
        }

        if (currentCoordinates.x !== nextCoordinates.x) {

            nextStateSymbol = currentCoordinates.x > nextCoordinates.x ? '^' : 'v'

            rotateCode = rotatePlayerFromTo(currentState, nextStateSymbol)
        }


        return {
            rotateCode: rotateCode,
            newState: nextStateSymbol,
        }
    }

    path.forEach((point, index) => {

        if (path.length - 1 === index) {
            return;
        }

        let currentCoordinates = parseCoordinates(point),
            nextCoordinates = parseCoordinates(path[index + 1]);

        let rotateAction = rotate(currentCoordinates, nextCoordinates, currentState)


        if (rotateAction.rotateCode !== null) {


            actions.push(rotateAction.rotateCode)
            currentState = rotateAction.newState


        }

        actions.push(forward)

    })

    return actions
}

/**
 * Возвращает символ из матрицы по координатам
 *
 * @param matrix
 * @param coordinates
 * @returns {*}
 */
function getPlayerStartSymbol(matrix, coordinates) {
    return matrix[coordinates.x][coordinates.y]
}

function escape(maze, algorithmFunc = dfsPriority) {

    let matrix = matrixFromMaze(maze),
        exitCoordinates = getExitCoordinates(matrix)[0]

    // console.table(matrix) //Дебаг для вывода матрицы в тесте на codewars.com

    if (exitCoordinates === undefined) {
        return []
    }

    let playerPosition = getPlayerStartCoordinates(matrix),
        playerSymbol = getPlayerStartSymbol(matrix, playerPosition),
        graph = graphFromMatrix(matrix, playerPosition, exitCoordinates)

    /**
     * Если игрок со старта стоит на выходе — возвращаем результат специально сделанной функции
     */
    if (playerPosition.x === exitCoordinates.x && playerPosition.y === exitCoordinates.y) {
        return playerOnExitByStartRotateAdapter(matrix, playerPosition, playerSymbol)
    }

    // Получение массиа с хэшерированными координатами в виде последовтаельсти
    const path = algorithmFunc(graph, playerPosition, exitCoordinates)

    console.dir(path, {'maxArrayLength': null});
    paintStepsWithoutTimeout(matrix, path)

    return graphPathIntoPlayerActionsQueueAdapter(path, playerSymbol)
}


// Test

let maze = ['#####################',
    '#<#   #     #       #',
    '# ### # ### # ##### #',
    '# #   #   # #     # #',
    '# # ##### # ##### # #',
    '#     # # #     # # #',
    '##### # # # ### # ###',
    '#   #   # # #   #   #',
    '# # ### # # # ##### #',
    '# #     # # #     # #',
    '# ####### # ####### #',
    '# #       # #       #',
    '# # ##### # # #######',
    '#   #   # #   #     #',
    '##### # # # ### ### #',
    '#   # #   #     # # #',
    '# # # # ####### # # #',
    '# # # # #   #   #   #',
    '# ### ### # # #######',
    '#   #     # #   #   #',
    '### ####### # # ### #',
    '#   #   #   # #     #',
    '# ### # # ### #######',
    '#     # # # # #   # #',
    '# ####### # # # # # #',
    '# #       #   # # # #',
    '# # ### ####### # # #',
    '# # #   #       #   #',
    '# # # ### # #########',
    '#   #     #         #',
    '################### #',
    '#   #     #     #   #',
    '### # ### # ### # ###',
    '#     # #   # # # # #',
    '# ##### ##### # # # #',
    '#     # #       #   #',
    '### ### # ### ### ###',
    '# #   # #   # #   # #',
    '# ### # ### # # ### #',
    '#     #     #       #',
    '################### #']


let escapeSteps = escape(maze, dfsPriority);

console.dir(escapeSteps, {'maxArrayLength': null});

