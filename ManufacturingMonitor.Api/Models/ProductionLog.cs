
using System.ComponentModel.DataAnnotations;

namespace ManufacturingMonitor.Api.Models;

public class ProductionLog : IValidatableObject
{
    public int Id { get; set; }

    public DateOnly ProductionDate { get; set; }

    [Required]
    [MaxLength(50)]
    public string ProductionLine { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Shift { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TargetUnits { get; set; }

    [Range(0, int.MaxValue)]
    public int ActualUnits { get; set; }

    [Range(0, int.MaxValue)]
    public int DefectUnits { get; set; }

    [Range(0, int.MaxValue)]
    public int DowntimeMinutes { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // A non-nullable DateOnly silently defaults when its JSON property is omitted.
        if (ProductionDate == default)
            yield return new ValidationResult("Production date is required.", [nameof(ProductionDate)]);
    }
}
