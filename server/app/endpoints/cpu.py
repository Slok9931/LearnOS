from fastapi import APIRouter, HTTPException
from app.models.cpu import SchedulingRequest
from app.models.response import APIResponse
from app.services.cpu import cpu_service

router = APIRouter()

@router.post("/api/cpu/fcfs")
async def fcfs(request: SchedulingRequest):
    try:
        result = cpu_service.fcfs(request)
        return APIResponse(success=True, data=result, message="FCFS scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/sjf")
async def sjf(request: SchedulingRequest):
    try:
        result = cpu_service.sjf(request)
        return APIResponse(success=True, data=result, message="SJF scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/priority")
async def priority(request: SchedulingRequest):
    try:
        result = cpu_service.priority_scheduling(request)
        return APIResponse(success=True, data=result, message="Priority scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/round-robin")
async def round_robin(request: SchedulingRequest):
    try:
        result = cpu_service.round_robin(request)
        return APIResponse(success=True, data=result, message="Round Robin scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/cpu/mlfq")
async def mlfq(request: SchedulingRequest):
    try:
        result = cpu_service.mlfq(request)
        return APIResponse(success=True, data=result, message="MLFQ scheduling completed successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/api/cpu/cfs")
async def cfs_scheduling(request: SchedulingRequest):
    """
    Completely Fair Scheduler (CFS) algorithm endpoint
    
    CFS is the default process scheduler used by Linux kernel.
    It maintains a red-black tree of runnable processes sorted by virtual runtime.
    
    Features:
    - Fair allocation of CPU time based on process weights
    - Nice values affect process priority (-20 to 19)
    - Virtual runtime tracking for fairness
    - Red-black tree for O(log n) operations
    """
    try:
        if not request.processes:
            raise HTTPException(status_code=400, detail="No processes provided")
        
        for process in request.processes:
            if process.burst_time <= 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Process {process.id} has invalid burst time"
                )
            if process.arrival_time < 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Process {process.id} has invalid arrival time"
                )
            if not (-20 <= process.priority <= 19):
                if process.priority < -20:
                    process.priority = -20
                elif process.priority > 19:
                    process.priority = 19
        
        result = cpu_service.cfs(request)
        
        return APIResponse(
            success=True,
            message="CFS scheduling completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
