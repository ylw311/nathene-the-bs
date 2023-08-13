import bodyParser from 'body-parser'
import express, { Request, Response } from 'express'

import { SnakeInfo, Move, Direction, GameRequest } from './types'


const PORT = process.env.PORT || 3000

const app = express()
app.use(bodyParser.json())

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

app.listen(PORT, () => console.log(`TypeScript Battlesnake Server listening at http://127.0.0.1:${PORT}`))

function handleIndex(request: Request, response: Response<SnakeInfo>) {
    const battlesnakeInfo: SnakeInfo = {
        apiversion: '1',
        author: 'Nathene',
        "color": "#F8C8DC",
        "head": "snowman",
        "tail": "comet"
    }
    response.status(200).json(battlesnakeInfo)
}

function handleStart(request: GameRequest, response: Response) {
    const gameData = request.body

    console.log('START')
    response.status(200).send('ok')
}

function handleMove(request: GameRequest, response: Response<Move>) {
    const gameData = request.body
    const head = gameData.you.head;
    const body = gameData.you.body;
    const board = gameData.board;
    const snakes = gameData.board.snakes;
    console.log("snakes" + JSON.stringify(snakes, null, 2));
    console.log("body" + JSON.stringify(body, null, 2));

    // const possibleMoves: Direction[] = ['up', 'down', 'left', 'right']
    // const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]




        // floodfill to prevent it locking itself 
        const claimed: boolean[][] = Array.from({ length: board.height }, () => new Array(board.width).fill(false));
        floodFill(board, head, claimed);


    // find closest food
    const closestFood = board.food.reduce((closest: any, food: any) => {
        const distance = Math.abs(food.x - head.x) + Math.abs(food.y - head.y);
        if (!closest || distance < closest.distance) {
            return {
                distance: distance,
                food: food,
            }
        } else {
            return closest;
        }
    }, null);



    const moves: Direction[]  = ['up', 'down', 'left', 'right']
  

    let possibleCells = moves.map(move => {
        let dx = 0;
        let dy = 0;

        if (move === 'up') {
            dy = 1;
        } else if (move === 'down') {
            dy = -1;
        } else if (move === 'left') {
            dx = -1;
        } else if (move === 'right') {
            dx = 1;
        }

        return {
            x: head.x + dx,
            y: head.y + dy,
            direction: move,
        }
    }).filter(direction => {
        // dont go out of bounds
        return direction.x >= 0 && direction.x < board.width && direction.y >= 0 && direction.y < board.height;
    }).filter(direction => {

        // dont hit other snakes
        return !snakes.some((snake: { body: any[] }) => snake.body.some((piece: { x: number; y: number }) => piece.x === direction.x && piece.y === direction.y));
    });

    
    
    
    if (possibleCells.length !== 1) {
       console.log("more than 1 possible cell");
       possibleCells = possibleCells.filter(direction => {
            // Avoid cells that another snake's head could reach in one step
            const isAdjacentToOtherHead = snakes.some((snake: { id: string, body: any[] }) => {
              
                // check if the other snake's is longer (i.e. needs to be avoided)
                if (snake.id !== gameData.you.id && snake.body.length >= body.length) { 
                    
                    return isAdjacentToHead(snake.body[0], direction.x, direction.y);
                
                }
                return false;
            });
            console.log("isAdjacentToOtherHeadDirection " + direction.direction + " " + isAdjacentToOtherHead)
            
            return !isAdjacentToOtherHead;
        });
    }
    
   
    
   console.log(possibleCells);


//    filter(direction => {
        // dont hit body piece 
    //     return !body.find((piece: { x: number; y: number }) => piece.x === direction.x && piece.y === direction.y);

    // })


     // Choose a move based on A* pathfinding toward the closest food
    let bestMove: Direction | undefined = undefined;
    let shortestPathLength = Infinity;

    for (const cell of possibleCells) {
        const pathToFood = aStarSearch(board, cell, closestFood.food);
        if (pathToFood && pathToFood.length < shortestPathLength) {
            shortestPathLength = pathToFood.length;
            bestMove = cell.direction as Direction;
        }
    }

    console.log("best move: " + bestMove);




    let move = bestMove || chooseSafeMove(board, head, body, possibleCells, claimed); // Implement your safe move logic
  
  
  
    
    // // Check if another snake is closer to the food
    // const otherSnakeCloser = snakes.some(snake => {
    //     if (snake.id === gameData.you.id) return false; // Skip own snake

    //     const snakeHead = snake.body[0];
    //     const snakeDistance = Math.abs(snakeHead.x - closestFood.food.x) + Math.abs(snakeHead.y - closestFood.food.y);
    //     return snakeDistance < closestFood.distance;
    // });

    // // Choose a move based on A* pathfinding if no other snake is closer to the food
    // // Otherwise, choose a safe move using flood-fill or other logic
    // if (!otherSnakeCloser && pathToFood && pathToFood.length > 1) {
    //     const nextCell = pathToFood[1];
    //     move = getMoveDirection(head, nextCell);
    // } else {
    //     move = chooseSafeMove(board, head, body); // Implement your safe move logic
    // }


    // // move towards closest food
    // const move = possibleCells.reduce((move: any, cell: any) => {
    //     const distance = Math.abs(cell.x - closestFood.food.x) + Math.abs(cell.y - closestFood.food.y);
    //     if (!move || distance < move.distance) {
    //         return {
    //             distance: distance,
    //             move: cell.direction,
    //         }
    //     } else {
    //         return move;
    //     }
    // }, null).move;

    if (move === undefined) {
        move = 'down';
        console.log('bruh how you even get here')
    }
    
    console.log('MOVE: ' + move)
    response.status(200).send({
        move: move,
    })
}

function handleEnd(request: GameRequest, response: Response) {
    const gameData = request.body

    console.log('END')
    response.status(200).send('ok')
}

function isAdjacentToHead(head: { x: number; y: number }, x: number, y: number): boolean {
    return (
        Math.abs(head.x - x) <= 1 && Math.abs(head.y - y) <= 1
    );
}


// Helper function to determine the direction from current position to next position
function getMoveDirection(current: { x: number; y: number }, next: { x: number; y: number }): Direction {
    if (next.x > current.x) return 'right';
    if (next.x < current.x) return 'left';
    if (next.y > current.y) return 'down';
    if (next.y < current.y) return 'up';
    return 'up'; // Default fallback
}

function chooseSafeMove(board: any, head: { x: number; y: number }, body: any[], possibleCells: { x: number; y: number; direction: Direction }[], claimed: boolean[][]): Direction | undefined {
    let bestMove: Direction | undefined = undefined;
    let maxPotentialSpace = -1;

    for (const cell of possibleCells) {
        const potentialSpace = calculatePotentialSpace(board, head, body, cell, claimed); // Pass claimed array to the function
        if (potentialSpace > maxPotentialSpace) {
            maxPotentialSpace = potentialSpace;
            bestMove = cell.direction;
        }
    }

    return bestMove;
}

function calculatePotentialSpace(board: any, head: { x: number; y: number }, body: any[], cell: { x: number; y: number; direction: Direction }, claimed: boolean[][]): number {
    if (!claimed[cell.y][cell.x]) {
        return 0;
    }
    
    const nextPos = cell;
    const visited: boolean[][] = Array.from({ length: board.height }, () => new Array(board.width).fill(false));
    let potentialSpace = 0;

    const dfs = (x: number, y: number) => {
        visited[y][x] = true;
        potentialSpace++;

        const neighbors = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 },
        ];

        for (const neighbor of neighbors) {
            if (
                neighbor.x >= 0 && neighbor.x < board.width &&
                neighbor.y >= 0 && neighbor.y < board.height &&
                !visited[neighbor.y][neighbor.x] &&
                !body.some(segment => segment.x === neighbor.x && segment.y === neighbor.y) &&
                !board.snakes.some((snake: { body: any[] }) => snake.body.some(segment => segment.x === neighbor.x && segment.y === neighbor.y))
            ) {
                dfs(neighbor.x, neighbor.y);
            }
        }
    };

    dfs(nextPos.x, nextPos.y);

    return potentialSpace;
}

// Define a node class to represent nodes in the search
class Node {
    constructor(public x: number, public y: number, public parent: Node | null = null, public g = 0, public h = 0) {}

    get f() {
        return this.g + this.h;
    }
}

// A* pathfinding algorithm
function aStarSearch(board: any, start: { x: number; y: number }, goal: { x: number; y: number }): Node[] | null {
    const openList: Node[] = [new Node(start.x, start.y)];
    const closedList: Node[] = [];

    while (openList.length > 0) {
        const current = openList.reduce((minNode, node) => (node.f < minNode.f ? node : minNode), openList[0]);

        openList.splice(openList.indexOf(current), 1);
        closedList.push(current);

        if (current.x === goal.x && current.y === goal.y) {
            // Reconstruct path and return
            const path: Node[] = [];
            let node: Node | null = current;
            while (node !== null) {
                path.unshift(node);
                node = node.parent;
            }
            return path;
        }

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];

        for (const neighbor of neighbors) {
            if (
                neighbor.x >= 0 && neighbor.x < board.width &&
                neighbor.y >= 0 && neighbor.y < board.height &&
                !board.snakes.some((snake: { body: any[] }) => snake.body.some(segment => segment.x === neighbor.x && segment.y === neighbor.y)) &&
                !closedList.some(node => node.x === neighbor.x && node.y === neighbor.y)
            ) {
                const g = current.g + 1;
                const h = Math.abs(neighbor.x - goal.x) + Math.abs(neighbor.y - goal.y);
                const neighborNode = new Node(neighbor.x, neighbor.y, current, g, h);

                if (!openList.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    openList.push(neighborNode);
                } else if (g < neighborNode.g) {
                    neighborNode.parent = current;
                    neighborNode.g = g;
                }
            }
        }
    }

    return null; // No path found
}



function floodFill(board: any, start: { x: number; y: number }, claimed: boolean[][]) {
    const queue: { x: number; y: number }[] = [start];
    claimed[start.y][start.x] = true;

    while (queue.length > 0) {
        const current = queue.shift();

        if (current !== undefined) {

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];
    

        for (const neighbor of neighbors) {
            if (
                neighbor.x >= 0 && neighbor.x < board.width &&
                neighbor.y >= 0 && neighbor.y < board.height &&
                !claimed[neighbor.y][neighbor.x] &&
                !board.snakes.some((snake: { body: any[] }) => snake.body.some(segment => segment.x === neighbor.x && segment.y === neighbor.y))
            ) {
                claimed[neighbor.y][neighbor.x] = true;
                queue.push(neighbor);
            }
        }
    } 
    
    }
}