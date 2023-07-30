import bodyParser from 'body-parser'
import express, { Request, Response } from 'express'
import { Coordinates, Direction, GameRequest, Move, SnakeInfo, Board } from './types';

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
    author: 'Linda Wang',
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
  // const gameData = request.body

  // const possibleMoves: Direction[] = ['up', 'down', 'left', 'right']
  // const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]

  // console.log('MOVE: ' + move)
  // response.status(200).send({
  //     move: move,
  // })

  const gameData = request.body;
  const mySnake = gameData.you;
  const board = gameData.board;
//   console.log(board);

  // Find the closest food using A*
  let closestFood: Coordinates | null = null;
 
  let closestFoodDistance: number = Infinity;
  for (const food of board.food) {
    const distance = manhattanDistance(mySnake.head, food);
    if (distance < closestFoodDistance) {
      closestFood = food;
      closestFoodDistance = distance;
      console.log(closestFood);
    }
  }

  // Use A* to find the best move towards the closest food
  let move: Direction | null = null;
  if (closestFood) {
    move = aStar(mySnake, board, mySnake.head, closestFood);
  }

  if (!move) {
    // If no food found or unreachable, fallback to random move
    const possibleMoves: Direction[] = ['up', 'down', 'left', 'right'];
    move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    console.log('random move');
  }

  console.log('MOVE: ' + move);
  response.status(200).send({
    move: move,
  });
}

function handleEnd(request: GameRequest, response: Response) {
  const gameData = request.body

  console.log('END')
  response.status(200).send('ok')
}

function manhattanDistance(start: Coordinates, end: Coordinates): number {
  return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
}

function aStar(mySnake: any, board: Board, start: Coordinates, target: Coordinates): Direction | null {
    const openSet: Coordinates[] = [start];
    const cameFrom: Record<string, Coordinates> = {};
    const gScore: Record<string, number> = { [`${start.x},${start.y}`]: 0 };
    const fScore: Record<string, number> = { [`${start.x},${start.y}`]: manhattanDistance(start, target) };
  
    const isValidMove = (x: number, y: number): boolean => {
      // Check for collisions with walls
      if (x < 0 || x >= board.width || y < 0 || y >= board.height) {
        console.log('collided with wall: ' + x + ' ' + y)
        return false;
      }
  
      // Check for collisions with other snakes
      if (board.snakes.some((snake) => snake.body.some((part) => part.x === x && part.y === y))) {
        console.log('collided with other: ' + x + ' ' + y);
        return false;
      }

      // Check for collisions with the snake's own body
    if (mySnake.body.some((part: { x: number; y: number; }) => part.x === x && part.y === y)) {
        console.log('collided with self: ' + x + ' ' + y);
        return false;
        
    }
  
      return true;
    };
  
    while (openSet.length > 0) {
      let current: Coordinates = openSet[0];
      let currentIndex: number = 0;
  
      openSet.forEach((coord, index) => {
        if (fScore[`${coord.x},${coord.y}`] < fScore[`${current.x},${current.y}`]) {
          current = coord;
          currentIndex = index;
        }
      });
  
      if (current.x === target.x && current.y === target.y) {
        // Reconstruct the path and find the first move
        let move: Coordinates = target;
        while (move.x !== start.x || move.y !== start.y) {
          if (move.x < cameFrom[`${move.x},${move.y}`].x) return 'left';
          if (move.x > cameFrom[`${move.x},${move.y}`].x) return 'right';
          if (move.y < cameFrom[`${move.x},${move.y}`].y) return 'up';
          if (move.y > cameFrom[`${move.x},${move.y}`].y) return 'down';
          move = cameFrom[`${move.x},${move.y}`];
        }
        return null;
      }
  
      openSet.splice(currentIndex, 1);
      const neighbors = [
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
      ];
  
      for (const neighbor of neighbors) {
        const { x, y } = neighbor;
        if (
          isValidMove(x, y) &&
          !cameFrom[`${x},${y}`]
        ) {
          const tentativeGScore = gScore[`${current.x},${current.y}`] + 1;
          if (!openSet.some((coord) => coord.x === x && coord.y === y)) {
            openSet.push(neighbor);
          } else if (tentativeGScore >= gScore[`${x},${y}`]) {
            continue;
          }
  
          cameFrom[`${x},${y}`] = current;
          gScore[`${x},${y}`] = tentativeGScore;
          fScore[`${x},${y}`] = tentativeGScore + manhattanDistance(neighbor, target);
        }
      }
    }
  
    // No path found
    return null;
  }
  
