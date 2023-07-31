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
        color: '#888888',
        head: 'default',
        tail: 'default',
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

    const possibleMoves: Direction[] = ['up', 'down', 'left', 'right']
    // const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]

    const moves  = ['up', 'down', 'left', 'right']
  

    const possibleCells = moves.map(move => {
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
        // dont hit body piece 
        return !body.find((piece: { x: any; y: any }) => piece.x === direction.x && piece.y === direction.y);

    });

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

    // move towards closest food
    const move = possibleCells.reduce((move: any, cell: any) => {
        const distance = Math.abs(cell.x - closestFood.food.x) + Math.abs(cell.y - closestFood.food.y);
        if (!move || distance < move.distance) {
            return {
                distance: distance,
                move: cell.direction,
            }
        } else {
            return move;
        }
    }, null).move;

    
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
