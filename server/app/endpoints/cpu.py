from fastapi import APIRouter, HTTPException
from app.models.cpu import CPUScheduleRequest
from app.models.response import APIResponse
from app.services.cpu import CPUSchedulerService

router = APIRouter(prefix="/api/cpu", tags=["CPU Scheduling"])

@router.post("/schedule", response_model=APIResponse)
async def schedule_processes(request: CPUScheduleRequest):
    """
    Schedule processes using the specified algorithm
    """
    try:
        if request.algo == "FCFS":
            result = CPUSchedulerService.fcfs_scheduling(
                processes=request.processes,
                context_switch_cost=request.config.context_switch_cost
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Algorithm '{request.algo}' not implemented yet"
            )
        
        return APIResponse(
            success=True,
            message=f"{request.algo} scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/algorithms")
async def get_supported_algorithms():
    """
    Get list of supported scheduling algorithms
    """
    return APIResponse(
        success=True,
        message="Supported algorithms retrieved",
        data={
            "algorithms": [
                {"name": "FCFS", "description": "First Come First Serve", "implemented": True},
                {"name": "SJF", "description": "Shortest Job First", "implemented": False},
                {"name": "Priority", "description": "Priority Scheduling", "implemented": False},
                {"name": "RoundRobin", "description": "Round Robin", "implemented": False},
                {"name": "MLFQ", "description": "Multi-Level Feedback Queue", "implemented": False}
            ]
        }
    )