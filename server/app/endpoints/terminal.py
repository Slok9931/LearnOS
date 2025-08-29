from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.process_manager import process_manager

router = APIRouter()

class CommandRequest(BaseModel):
    command: str
    args: List[str] = []

@router.post("/api/terminal/execute")
async def execute_command(request: CommandRequest):
    try:
        result = process_manager.execute_command(request.command, request.args)
        return {
            "success": True,
            "message": f"Command '{request.command}' executed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/terminal/processes")
async def get_processes():
    try:
        return {
            "success": True,
            "data": {
                "processes": process_manager.get_all_processes()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/terminal/trap-table")
async def get_trap_table():
    try:
        return {
            "success": True,
            "data": {
                "trap_table": [entry.dict() for entry in process_manager.get_trap_table()],
                "system_calls": [call.dict() for call in process_manager.get_recent_system_calls(10)]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/terminal/reset")
async def reset_system():
    try:
        process_manager.__init__()
        return {
            "success": True,
            "message": "System reset successfully",
            "data": {
                "processes": process_manager.get_all_processes()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))