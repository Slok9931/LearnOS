from fastapi import APIRouter, HTTPException
from app.models.memory import MemoryRequest, LinearAllocationConfig, SegmentationConfig, PagingConfig, MultiLevelPagingConfig
from app.models.response import APIResponse
from app.services.memory import memory_service

router = APIRouter()

@router.post("/api/memory/linear")
async def linear_allocation(request: MemoryRequest):
    """
    Linear/Contiguous Memory Allocation
    
    Supports different allocation strategies:
    - First Fit: Allocate first available block that fits
    - Best Fit: Allocate smallest available block that fits
    - Worst Fit: Allocate largest available block that fits
    - Next Fit: Allocate next available block after last allocation
    
    Features:
    - Memory compaction to reduce external fragmentation
    - Visualization of memory layout and fragmentation
    - Detailed allocation timeline and statistics
    """
    try:
        if not isinstance(request.config, LinearAllocationConfig):
            raise HTTPException(status_code=400, detail="Invalid configuration for linear allocation")
        
        if not request.processes:
            raise HTTPException(status_code=400, detail="No processes provided")
        
        for process in request.processes:
            if process.size <= 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Process {process.name} has invalid size"
                )
            if process.arrival_time < 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Process {process.name} has invalid arrival time"
                )
        
        result = memory_service.linear_allocation(request)
        
        return APIResponse(
            success=True,
            message="Linear allocation completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/memory/segmentation")
async def segmentation(request: MemoryRequest):
    """
    Segmentation Memory Management
    
    Features:
    - Logical segments (code, data, stack, heap)
    - Segment protection and sharing
    - Base and limit registers for each segment
    - Support for variable-sized segments
    
    Each process can have multiple segments with different:
    - Types (code, data, stack, heap)
    - Sizes and protection attributes
    - Base addresses and limits
    """
    try:
        if not isinstance(request.config, SegmentationConfig):
            raise HTTPException(status_code=400, detail="Invalid configuration for segmentation")
        
        if not request.processes:
            raise HTTPException(status_code=400, detail="No processes provided")
        
        for process in request.processes:
            if process.size <= 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Process {process.name} has invalid size"
                )
        
        result = memory_service.segmentation(request)
        
        return APIResponse(
            success=True,
            message="Segmentation completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/memory/paging")
async def paging(request: MemoryRequest):
    """
    Paging Memory Management
    
    Features:
    - Fixed-size pages and frames
    - Page tables for address translation
    - Virtual memory with page replacement algorithms
    - TLB (Translation Lookaside Buffer) simulation
    
    Supported page replacement algorithms:
    - FIFO (First In, First Out)
    - LRU (Least Recently Used)
    - LFU (Least Frequently Used)
    - Optimal (Belady's algorithm)
    - Clock algorithm
    - Second Chance algorithm
    """
    try:
        if not isinstance(request.config, PagingConfig):
            raise HTTPException(status_code=400, detail="Invalid configuration for paging")
        
        if not request.processes:
            raise HTTPException(status_code=400, detail="No processes provided")
        
        if request.config.page_size <= 0:
            raise HTTPException(status_code=400, detail="Page size must be greater than 0")
        
        for process in request.processes:
            if process.size <= 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Process {process.name} has invalid size"
                )
        
        result = memory_service.paging(request)
        
        return APIResponse(
            success=True,
            message="Paging completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/api/memory/multi-level-paging")
async def multi_level_paging(request: MemoryRequest):
    """
    Multi-Level Paging Memory Management
    
    Features:
    - Hierarchical page tables (2-level, 3-level, etc.)
    - Demand paging with working set management
    - Advanced page replacement algorithms
    - Page fault handling and swap management
    - Memory-mapped files simulation
    
    Benefits:
    - Reduced page table space overhead
    - Support for large virtual address spaces
    - Efficient memory utilization
    - Working set-based locality optimization
    """
    try:
        if not isinstance(request.config, MultiLevelPagingConfig):
            raise HTTPException(status_code=400, detail="Invalid configuration for multi-level paging")
        
        if not request.processes:
            raise HTTPException(status_code=400, detail="No processes provided")
        
        # Validate configuration
        if request.config.levels < 2:
            raise HTTPException(status_code=400, detail="Multi-level paging requires at least 2 levels")
        
        if request.config.page_size <= 0:
            raise HTTPException(status_code=400, detail="Page size must be greater than 0")
        
        if request.config.working_set_size <= 0:
            raise HTTPException(status_code=400, detail="Working set size must be greater than 0")
        
        # Validate processes
        for process in request.processes:
            if process.size <= 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Process {process.name} has invalid size"
                )
        
        result = memory_service.multi_level_paging(request)
        
        return APIResponse(
            success=True,
            message="Multi-level paging completed successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/api/memory/algorithms")
async def get_memory_algorithms():
    """
    Get list of supported memory management algorithms
    """
    try:
        algorithms = {
            "linear": {
                "name": "Linear/Contiguous Allocation",
                "description": "Contiguous memory allocation with different fit strategies",
                "methods": ["first_fit", "best_fit", "worst_fit", "next_fit"],
                "features": ["compaction", "fragmentation_analysis"]
            },
            "segmentation": {
                "name": "Segmentation",
                "description": "Logical segmentation with protection and sharing",
                "features": ["variable_segments", "protection", "sharing"]
            },
            "paging": {
                "name": "Paging",
                "description": "Fixed-size paging with virtual memory",
                "features": ["page_replacement", "tlb", "virtual_memory"],
                "replacement_algorithms": ["fifo", "lru", "lfu", "optimal", "clock", "second_chance"]
            },
            "multi_level_paging": {
                "name": "Multi-Level Paging",
                "description": "Hierarchical paging with demand loading",
                "features": ["hierarchical_tables", "demand_paging", "working_set"],
                "levels": [2, 3, 4]
            }
        }
        
        return APIResponse(
            success=True,
            message="Memory algorithms retrieved successfully",
            data=algorithms
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/api/memory/health")
async def memory_health_check():
    """
    Health check endpoint for memory management service
    """
    try:
        return APIResponse(
            success=True,
            message="Memory management service is healthy",
            data={
                "status": "healthy",
                "service": "memory_management",
                "algorithms": ["linear", "segmentation", "paging", "multi_level_paging"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")