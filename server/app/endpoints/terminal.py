from fastapi import APIRouter, HTTPException
from app.models.response import APIResponse
from app.models.process import TerminalCommand
from app.services.process_manager import process_manager

router = APIRouter()

@router.post("/api/terminal/execute")
async def execute_command(command: TerminalCommand):
    try:
        result = process_manager.execute_command(command.command, command.args)
        return APIResponse(
            success=True, 
            data=result, 
            message=f"Command '{command.command}' executed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/terminal/processes")
async def get_processes():
    try:
        processes = process_manager.get_all_processes()
        return APIResponse(
            success=True,
            data={"processes": processes},
            message="Process list retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/terminal/trap-table")
async def get_trap_table():
    try:
        trap_table = process_manager.get_trap_table()
        return APIResponse(
            success=True,
            data={"trap_table": trap_table},
            message="Trap table retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/terminal/system-calls")
async def get_system_calls():
    try:
        system_calls = process_manager.get_recent_system_calls()
        return APIResponse(
            success=True,
            data={"system_calls": system_calls},
            message="System calls retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/terminal/reset")
async def reset_system():
    try:
        process_manager.reset_system()
        return APIResponse(
            success=True,
            data={},
            message="System reset successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))