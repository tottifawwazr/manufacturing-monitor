using System.Net;
using System.Net.Http.Json;
using System.Text;
using ManufacturingMonitor.Api.Models;

namespace ManufacturingMonitor.Api.Tests;

public sealed class ProductionLogsTests : ApiTest
{
    [Fact]
    public async Task Crud_roundtrip_persists_updates_and_deletes_without_changing_ids()
    {
        var input = Record();
        input.Id = 999;
        var created = await Client.PostAsJsonAsync("/api/productionlogs", input);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var record = (await created.Content.ReadFromJsonAsync<ProductionLog>())!;
        Assert.True(record.Id > 0);
        Assert.NotEqual(999, record.Id);
        Assert.EndsWith($"/api/productionlogs/{record.Id}", created.Headers.Location!.ToString());
        var stored = (await Client.GetFromJsonAsync<ProductionLog>($"/api/productionlogs/{record.Id}"))!;
        Assert.Equal(input.Notes, stored.Notes);
        Assert.Equal(input.ProductionDate, stored.ProductionDate);

        stored.Id = 888; // Route ID controls the update, not a user-supplied body ID.
        stored.ActualUnits = 100;
        stored.DefectUnits = 2;
        stored.Notes = "Updated test remarks";
        Assert.Equal(HttpStatusCode.NoContent, (await Client.PutAsJsonAsync($"/api/productionlogs/{record.Id}", stored)).StatusCode);
        var updated = (await Client.GetFromJsonAsync<ProductionLog>($"/api/productionlogs/{record.Id}"))!;
        Assert.Equal(record.Id, updated.Id);
        Assert.Equal(100, updated.ActualUnits);
        Assert.Equal(2, updated.DefectUnits);
        Assert.Equal(stored.Notes, updated.Notes);
        Assert.Single((await Client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!);
        Assert.Equal(HttpStatusCode.NoContent, (await Client.DeleteAsync($"/api/productionlogs/{record.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/productionlogs/{record.Id}")).StatusCode);
        Assert.Empty((await Client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(999999)]
    public async Task Missing_records_return_404_for_read_update_and_delete(int id)
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync($"/api/productionlogs/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.PutAsJsonAsync($"/api/productionlogs/{id}", Record())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.DeleteAsync($"/api/productionlogs/{id}")).StatusCode);
    }

    public static IEnumerable<object[]> InvalidInputs()
    {
        yield return ["targetUnits", 0];
        yield return ["targetUnits", -1];
        yield return ["actualUnits", -1];
        yield return ["defectUnits", -1];
        yield return ["defectUnits", 91];
        yield return ["downtimeMinutes", -1];
        yield return ["productionLine", ""];
        yield return ["productionLine", "   "];
        yield return ["productionLine", new string('x', 51)];
        yield return ["shift", ""];
        yield return ["shift", new string('x', 21)];
        yield return ["notes", new string('x', 501)];
        yield return ["productionDate", "2026-02-30"];
        yield return ["productionDate", "not-a-date"];
        yield return ["actualUnits", 1.5];
        yield return ["targetUnits", 2147483648L];
        yield return ["productionDate", null!]; // Missing required date must not become 0001-01-01.
    }

    [Theory]
    [MemberData(nameof(InvalidInputs))]
    public async Task Invalid_create_and_update_are_rejected_without_changing_stored_data(string field, object value)
    {
        var existing = Record();
        await Factory.AddRecordsAsync(existing);
        var input = new Dictionary<string, object?>
        {
            ["productionDate"] = "2026-11-10", ["productionLine"] = "Line A", ["shift"] = "Morning",
            ["targetUnits"] = 100, ["actualUnits"] = 90, ["defectUnits"] = 1, ["downtimeMinutes"] = 5, ["notes"] = "unchanged"
        };
        if (value is null) input.Remove(field);
        else input[field] = value;
        Assert.Equal(HttpStatusCode.BadRequest, (await Client.PostAsJsonAsync("/api/productionlogs", input)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Client.PutAsJsonAsync($"/api/productionlogs/{existing.Id}", input)).StatusCode);
        var stored = Assert.Single((await Client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!);
        Assert.Equal(existing.Notes, stored.Notes);
        Assert.Equal(90, stored.ActualUnits);
        Assert.Equal(existing.ProductionDate, stored.ProductionDate);
    }

    [Theory]
    [InlineData("null")]
    [InlineData("{}")]
    [InlineData("{broken-json")]
    public async Task Invalid_request_bodies_return_400(string json)
    {
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.BadRequest, (await Client.PostAsync("/api/productionlogs", content)).StatusCode);
        Assert.Empty((await Client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!);
    }

    [Fact]
    public async Task Optional_notes_and_zero_values_are_valid_and_list_is_sorted_by_date_then_id()
    {
        var older = Record(actual: 0, defects: 0, downtime: 0, date: "2026-11-09");
        older.Notes = null;
        var first = Record();
        var second = Record(line: "Line B");
        await Factory.AddRecordsAsync(older, first, second);
        var records = (await Client.GetFromJsonAsync<ProductionLog[]>("/api/productionlogs"))!;
        Assert.Equal(new[] { second.Id, first.Id, older.Id }, records.Select(x => x.Id));
        var valid = Record(actual: 0, defects: 0, downtime: 0);
        valid.Notes = null;
        Assert.Equal(HttpStatusCode.Created, (await Client.PostAsJsonAsync("/api/productionlogs", valid)).StatusCode);
    }
}
