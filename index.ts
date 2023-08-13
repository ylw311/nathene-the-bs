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
        author: 'ylw311',
        "color": "#E37383",
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
    // console.log("snakes" + JSON.stringify(snakes, null, 2));
    // console.log("body" + JSON.stringify(body, null, 2));

    // const possibleMoves: Direction[] = ['up', 'down', 'left', 'right']
    // const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]



    
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


     
    // // Check if another snake is closer to the food
    // problem: if there's several snakes, they could all be closer to the food than you
    // const otherSnakeCloser = snakes.some(snake => {
    //     if (snake.id === gameData.you.id) return false; // Skip own snake

    //     const snakeHead = snake.body[0];
    //     const snakeDistance = Math.abs(snakeHead.x - closestFood.food.x) + Math.abs(snakeHead.y - closestFood.food.y);
    //     return snakeDistance < closestFood.distance;
    // });


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
    
        // Calculate the new cell position after the move
        const newCell = {
            x: head.x + dx,
            y: head.y + dy,
            direction: move,
        };
    
        // Check if the new cell is out of bounds
        if (
            newCell.x >= 0 && newCell.x < board.width &&
            newCell.y >= 0 && newCell.y < board.height
        ) {
            // Check if the new cell is not occupied by other snakes
            const isSafe = !snakes.some((snake: { body: any[] }) =>
                snake.body.some((piece: { x: number; y: number }) =>
                    piece.x === newCell.x && piece.y === newCell.y
                )
            );
    
            // If the move is safe according to flood-fill, return the cell
            // Otherwise, return null
            return isSafe ? newCell : null;
        }
    
        return undefined;
    }).filter((cell): cell is { x: number; y: number; direction: Direction } => cell !== null && cell !== undefined);
    // Filter out null cells
    
    // Now, possibleCells contains only safe and valid moves
    
    
    // Create a copy of possibleCells 
    let possibleCellsWOAbsDeath = [...possibleCells]; 

    if (possibleCells.length !== 1) {
        console.log("more than 1 possible cell");
    
      
    
        // Filter out cells that another snake's head could reach in one step
        possibleCells = possibleCells.filter((cell: any) => {
            console.log("cell" + JSON.stringify(cell, null, 2));
            if (cell === undefined) {
                return false;
            }
    
            const isAdjacentToOtherHead = snakes.some((snake: { id: string, body: any[] }) => {
                if (snake.id !== gameData.you.id && snake.body.length >= body.length) {
                    return isAdjacentToHead(snake.body[0], cell.x, cell.y);
                }
                return false;
            });
    
            console.log("isAdjacentToOtherHeadDirection " + cell.direction + " " + isAdjacentToOtherHead);
    
            // Also check if the move is safe according to flood-fill
            return !isAdjacentToOtherHead;
        });
    }
    
    console.log("possibleCells" + JSON.stringify(possibleCells, null, 2));

    
    // ... Rest of the code
    

    

//    filter(direction => {
        // dont hit body piece 
    //     return !body.find((piece: { x: number; y: number }) => piece.x === direction.x && piece.y === direction.y);

    // })


     // Choose a move based on A* pathfinding toward the closest food
    let bestMove: Direction | undefined = undefined;
    let shortestPathLength = Infinity;

    for (const cell of possibleCells) {
        if (cell) { // Add this null check
            const pathToFood = aStarSearch(board, cell, closestFood.food);
            if (pathToFood && pathToFood.length < shortestPathLength) {
                shortestPathLength = pathToFood.length;
                bestMove = cell.direction as Direction;
            }
        }
    }
    
    

    console.log("best move: " + bestMove);

    let move : Direction | undefined = undefined;
    
    move = bestMove;
  
   
   
    if (move === undefined) {
        // No optimal path, pick a random move from those that wont result in absolute death
        // e.g. two moves could both lead to headvshead collision, but you wouldn't know what other snake picks (i.e. gg gl at this point)
        const randomIndex = Math.floor(Math.random() * possibleCells.length);
        move = possibleCellsWOAbsDeath[randomIndex]?.direction || 'down'; // Pick a random move or default to 'down'
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



